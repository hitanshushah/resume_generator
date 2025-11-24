from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
import json


@api_view(['POST'])
def save_template(request):
    """
    Save resume template to database.
    Expects: user_id and template (HTML content with placeholders)
    """
    try:
        user_id = request.data.get('user_id')
        template = request.data.get('template')

        if not user_id or not template:
            return Response(
                {'error': 'user_id and template are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate user_id
        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with connection.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get profile_id from profiles table
            cursor.execute(
                "SELECT id FROM profiles WHERE user_id = %s LIMIT 1",
                [user_id_int]
            )
            profile_row = cursor.fetchone()
            
            if not profile_row:
                return Response(
                    {'error': f'Profile not found for user_id {user_id_int}.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            profile_id = profile_row[0]

            # Convert template to JSONB
            template_jsonb = json.dumps(template)

            # Update the resume_template column in profiles table
            cursor.execute(
                """
                UPDATE profiles 
                SET resume_template = %s::jsonb, updated_at = NOW()
                WHERE id = %s
                """,
                [template_jsonb, profile_id]
            )

            return Response(
                {
                    'success': True,
                    'message': 'Template saved successfully',
                    'profile_id': profile_id
                },
                status=status.HTTP_200_OK
            )

    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

