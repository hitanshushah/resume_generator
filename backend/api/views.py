from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db import connection
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