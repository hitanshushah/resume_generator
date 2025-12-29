from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import StreamingHttpResponse
from django.db import connection
from django.utils import timezone
import os
import json
import time
import jwt
from .helpers import get_user_details_data, prepare_resume_sections, send_to_ollama

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

def verify_jwt_token(token: str) -> dict | None:
    """Verify and decode JWT token"""
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return decoded
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def check_demo_rate_limit(jwt_token: str) -> tuple[bool, int]:
    """
    Check if demo user has exceeded rate limit.
    Returns (is_allowed, current_count)
    """
    if not jwt_token:
        return (False, 0)
    
    decoded = verify_jwt_token(jwt_token)
    if not decoded:
        return (False, 0)
    
    ip_address = decoded.get('ip')
    if not ip_address:
        return (False, 0)
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT generation_count, expiry
            FROM token_managements
            WHERE token = %s
            AND ip_address = %s
            AND expiry > %s
        """, [jwt_token, ip_address, timezone.now()])
        
        row = cursor.fetchone()
        
        if not row:
            return (False, 0)
        
        generation_count, expiry = row
        
        if generation_count >= 5:
            return (False, generation_count)
        
        new_count = generation_count + 1
        
        cursor.execute("""
            UPDATE token_managements
            SET generation_count = %s, updated_at = %s
            WHERE token = %s
            AND ip_address = %s
        """, [new_count, timezone.now(), jwt_token, ip_address])
        
        return (True, new_count)


def generate_resume_stream(request):
    """
    Generator function that processes resume sections sequentially
    and yields responses as they are generated.
    Now generates only 3 sections: summary, experiences, and projects.
    """
    try:
        prompt = request.data.get('prompt')
        job_description = request.data.get('job_description')
        user_id = request.data.get('user_id')
        jwt_token = request.data.get('jwt_token')
        username = request.data.get('username')

        if not prompt or not job_description or not user_id:
            yield f"data: {json.dumps({'error': 'prompt, job_description, and user_id are required', 'type': 'error'})}\n\n"
            return

        if username == 'demo':
            if not jwt_token:
                yield f"data: {json.dumps({'error': 'JWT token is required for demo users', 'type': 'error'})}\n\n"
                return
            
            is_allowed, current_count = check_demo_rate_limit(jwt_token)
            
            if not is_allowed:
                yield f"data: {json.dumps({'error': 'Rate limit exceeded. You have generated 5 resumes in the last hour. Please wait before generating more.', 'type': 'error', 'rate_limit_exceeded': True, 'current_count': current_count})}\n\n"
                return

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            yield f"data: {json.dumps({'error': 'Invalid user_id. Must be a valid integer.', 'type': 'error'})}\n\n"
            return

        ollama_host = os.getenv('OLLAMA_HOST')
        ollama_port = os.getenv('OLLAMA_PORT')
        ollama_model = os.getenv('OLLAMA_MODEL')
        
        if not ollama_host or not ollama_port or not ollama_model:
            yield f"data: {json.dumps({'error': 'Ollama configuration is missing. Please set OLLAMA_HOST, OLLAMA_PORT, and OLLAMA_MODEL environment variables.', 'type': 'error'})}\n\n"
            return

        user_details = get_user_details_data(user_id_int)
        if not user_details:
            yield f"data: {json.dumps({'error': f'User with id {user_id_int} does not exist or has no data.', 'type': 'error'})}\n\n"
            return

        sections = prepare_resume_sections(user_details, prompt, job_description)
        total_sections = len(sections)
        
        yield f"data: {json.dumps({'type': 'progress', 'total': total_sections, 'current': 0, 'message': 'Job description received. Starting resume generation...'})}\n\n"
        
        accumulated_response = {}
        
        for index, section_info in enumerate(sections, 1):
            section_name = section_info['section']
            section_title = section_info['title']
            section_prompt = section_info['prompt']
            section_data = section_info.get('data', {})
            
            try:
                yield f"data: {json.dumps({'type': 'progress', 'total': total_sections, 'current': index, 'section': section_name, 'title': section_title, 'message': f'Generating {section_title}...'})}\n\n"
                
                section_response = send_to_ollama(
                    section_prompt,
                    ollama_host,
                    ollama_port,
                    ollama_model,
                    stream=False
                )
                            
                response_data = {
                    'type': 'section',
                    'section': section_name,
                    'title': section_title,
                    'content': section_response,
                    'progress': {'total': total_sections, 'current': index}
                }
                
                if section_name == 'experience':
                    response_data['company_name'] = section_data.get('company_name', '')
                    response_data['index'] = section_data.get('index', 0)
                elif section_name == 'project':
                    response_data['project_name'] = section_data.get('project_name', '')
                    response_data['index'] = section_data.get('index', 0)
                
                if section_name in ['experience', 'project']:
                    key = f"{section_name}_{section_data.get('index', 0)}"
                    accumulated_response[key] = {
                        'title': section_title,
                        'content': section_response,
                        'company_name': section_data.get('company_name', '') if section_name == 'experience' else None,
                        'project_name': section_data.get('project_name', '') if section_name == 'project' else None,
                    }
                else:
                    accumulated_response[section_name] = {
                        'title': section_title,
                        'content': section_response
                    }
                
                yield f"data: {json.dumps(response_data)}\n\n"
                
            except Exception as e:
                error_msg = f'Error generating {section_title}: {str(e)}'
                yield f"data: {json.dumps({'type': 'section_error', 'section': section_name, 'title': section_title, 'error': error_msg, 'progress': {'total': total_sections, 'current': index}})}\n\n"
                continue
        
        yield f"data: {json.dumps({'type': 'complete', 'total': total_sections, 'message': 'Resume generation completed', 'sections': list(accumulated_response.keys())})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'error': f'Internal server error: {str(e)}'})}\n\n"


@api_view(['POST'])
def generate_resume(request):
    """
    Generate resume endpoint that streams responses section by section.
    Uses Server-Sent Events (SSE) for real-time updates.
    """
    response = StreamingHttpResponse(
        generate_resume_stream(request),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

