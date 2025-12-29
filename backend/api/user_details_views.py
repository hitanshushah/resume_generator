from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .helpers import get_user_details_data


@api_view(['GET'])
def get_user_details(request, user_id):
    """
    Get comprehensive user details including profile, projects, certifications, etc.
    """
    try:

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )


        user_details = get_user_details_data(user_id_int)
        
        if not user_details:
            return Response(
                {'error': f'User with id {user_id_int} does not exist or has no data.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(user_details, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

