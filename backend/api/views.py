from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db import connection

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