from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.utils import timezone
import os
import requests

@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'ok', 'message': 'Resume Generator API is running'}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
def test(request):
    """Simple test endpoint that returns true"""
    return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_users(request):
    """Get all users from the database using raw SQL"""
    with connection.cursor() as cursor:
        cursor.execute("SELECT id, username, email FROM users")
        rows = cursor.fetchall()
        # Convert rows to list of dicts
        users_list = [
            {"id": row[0], "username": row[1], "email": row[2]} 
            for row in rows
        ]

    return Response({'users': users_list, 'count': len(users_list)}, status=status.HTTP_200_OK)


def get_or_create_profile(cursor, user_id, name=None):
    cursor.execute("SELECT id, name FROM profiles WHERE user_id = %s", [user_id])
    profile_row = cursor.fetchone()
    profile_id = profile_row[0] if profile_row else None
    profile_name = profile_row[1] if profile_row else None

    if name and not profile_row:
        cursor.execute(
            "INSERT INTO profiles (user_id, name, created_at, updated_at) VALUES (%s, %s, %s, %s)",
            [user_id, name, timezone.now(), timezone.now()]
        )
        cursor.execute("SELECT id FROM profiles WHERE user_id = %s", [user_id])
        profile_row = cursor.fetchone()
        profile_id = profile_row[0] if profile_row else None
        profile_name = name

    return profile_id, profile_name

def get_profile_photo(cursor, profile_id):
    if not profile_id:
        return None

    cursor.execute("""
        SELECT a.filename 
        FROM assets a
        INNER JOIN asset_types at ON a.asset_type_id = at.id
        WHERE a.assetable_id = %s
        AND a.assetable_type = %s
        AND a.deleted_at IS NULL
        AND at.key = %s
        LIMIT 1
    """, [profile_id, 'App\\Models\\Profile', 'images'])
    photo_row = cursor.fetchone()
    return photo_row[0] if photo_row else None

@api_view(['POST'])
def check_or_create_user(request):
    try:
        username = request.data.get('username')
        email = request.data.get('email')
        name = request.data.get('name')

        if not username or not email:
            return Response(
                {'error': 'Username and email are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        username = str(username).strip()
        email = str(email).strip()
        name = str(name).strip() if name else None

        with connection.cursor() as cursor:
            cursor.execute("SELECT id, username, email FROM users WHERE email = %s", [email])
            row = cursor.fetchone()

            if row:
                user_id, user_username, user_email = row
                created = False
            else:
                cursor.execute(
                    "INSERT INTO users (username, email, created_at, updated_at) VALUES (%s, %s, %s, %s)",
                    [username, email, timezone.now(), timezone.now()]
                )
                cursor.execute("SELECT id, username, email FROM users WHERE email = %s", [email])
                row = cursor.fetchone()
                user_id, user_username, user_email = row
                created = True

            profile_id, profile_name = get_or_create_profile(cursor, user_id, name)
            profile_photo = get_profile_photo(cursor, profile_id)

            return Response({
                'id': user_id,
                'username': user_username,
                'email': user_email,
                'name': profile_name,
                'profile_photo': profile_photo,
                'created': created
            }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def chat(request):
    """Chat endpoint that sends message to Ollama model"""
    try:
        message = request.data.get('message')
        if not message:
            return Response(
                {'error': 'Message is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        

        ollama_host = os.getenv('OLLAMA_HOST')
        ollama_port = os.getenv('OLLAMA_PORT')
        ollama_model = os.getenv('OLLAMA_MODEL')
        
        # Build Ollama API URL
        ollama_url = f"http://{ollama_host}:{ollama_port}/api/generate"
        
        # Prepare request to Ollama
        ollama_payload = {
            'model': ollama_model,
            'prompt': message,
            'stream': False
        }
        
        # Make request to Ollama
        try:
            ollama_response = requests.post(
                ollama_url,
                json=ollama_payload,
                timeout=300  # 5 minute timeout for model responses
            )
            ollama_response.raise_for_status()
            
            ollama_data = ollama_response.json()
            response_text = ollama_data.get('response', '')
            
            return Response({
                'response': response_text,
                'model': ollama_model
            }, status=status.HTTP_200_OK)
            
        except requests.exceptions.RequestException as e:
            return Response(
                {'error': f'Failed to connect to Ollama: {str(e)}'}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )