from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'ok', 'message': 'Resume Generator API is running'}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
def test(request):
    """Simple test endpoint that returns true"""
    return Response({'success': True}, status=status.HTTP_200_OK)

