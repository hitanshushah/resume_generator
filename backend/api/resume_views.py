from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import StreamingHttpResponse
import os
import json
from .helpers import get_user_details_data, prepare_resume_sections, send_to_ollama


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

        if not prompt or not job_description or not user_id:
            yield f"data: {json.dumps({'error': 'prompt, job_description, and user_id are required', 'type': 'error'})}\n\n"
            return

        # Validate user_id
        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            yield f"data: {json.dumps({'error': 'Invalid user_id. Must be a valid integer.', 'type': 'error'})}\n\n"
            return

        # Get Ollama configuration
        ollama_host = os.getenv('OLLAMA_HOST')
        ollama_port = os.getenv('OLLAMA_PORT')
        ollama_model = os.getenv('OLLAMA_MODEL')
        
        if not ollama_host or not ollama_port or not ollama_model:
            yield f"data: {json.dumps({'error': 'Ollama configuration is missing. Please set OLLAMA_HOST, OLLAMA_PORT, and OLLAMA_MODEL environment variables.', 'type': 'error'})}\n\n"
            return

        # Get user details
        user_details = get_user_details_data(user_id_int)
        if not user_details:
            yield f"data: {json.dumps({'error': f'User with id {user_id_int} does not exist or has no data.', 'type': 'error'})}\n\n"
            return

        # Step 1: Send job description acknowledgment
        yield f"data: {json.dumps({'type': 'progress', 'total': 3, 'current': 0, 'message': 'Job description received. Starting resume generation...'})}\n\n"
        
        # Prepare sections (now only 3: summary, experiences, projects)
        sections = prepare_resume_sections(user_details, prompt, job_description)
        total_sections = len(sections)
        
        accumulated_response = {}
        
        # Process each section sequentially
        for index, section_info in enumerate(sections, 1):
            section_name = section_info['section']
            section_title = section_info['title']
            section_prompt = section_info['prompt']
            
            try:
                # Send progress update
                yield f"data: {json.dumps({'type': 'progress', 'total': 3, 'current': index, 'section': section_name, 'title': section_title, 'message': f'Generating {section_title}...'})}\n\n"
                
                # Send section to Ollama
                section_response = send_to_ollama(
                    section_prompt,
                    ollama_host,
                    ollama_port,
                    ollama_model,
                    stream=False
                )
                
                # Store the response
                accumulated_response[section_name] = {
                    'title': section_title,
                    'content': section_response
                }
                
                # Send section response to frontend immediately
                yield f"data: {json.dumps({'type': 'section', 'section': section_name, 'title': section_title, 'content': section_response, 'progress': {'total': 3, 'current': index}})}\n\n"
                
            except Exception as e:
                # If a section fails, send error but continue with next sections
                error_msg = f'Error generating {section_title}: {str(e)}'
                yield f"data: {json.dumps({'type': 'section_error', 'section': section_name, 'title': section_title, 'error': error_msg, 'progress': {'total': 3, 'current': index}})}\n\n"
                # Continue with next section even if this one failed
                continue
        
        # Send completion message
        yield f"data: {json.dumps({'type': 'complete', 'total': 3, 'message': 'Resume generation completed', 'sections': list(accumulated_response.keys())})}\n\n"
        
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
    response['X-Accel-Buffering'] = 'no'  # Disable buffering in nginx
    return response

