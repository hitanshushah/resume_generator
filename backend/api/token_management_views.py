from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.utils import timezone
from datetime import timedelta
import jwt
import os

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

@api_view(['GET'])
def get_token_by_ip(request):
    """Get token management record by IP address"""
    try:
        ip_address = request.query_params.get('ip_address')
        
        if not ip_address:
            return Response(
                {'error': 'ip_address parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM token_managements
                WHERE expiry < %s
            """, [timezone.now()])
            
            cursor.execute("""
                SELECT token, generation_count, expiry
                FROM token_managements
                WHERE ip_address = %s
                AND expiry > %s
                ORDER BY created_at DESC
                LIMIT 1
            """, [ip_address, timezone.now()])
            
            row = cursor.fetchone()
            
            if row:
                token, generation_count, expiry = row
                return Response({
                    'token': token,
                    'generation_count': generation_count,
                    'expiry': expiry.isoformat() if expiry else None,
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'No valid token found for this IP'},
                    status=status.HTTP_404_NOT_FOUND
                )
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def create_or_get_token(request):
    """Create a new token management record or return existing valid one"""
    try:
        token = request.data.get('token')
        ip_address = request.data.get('ip_address')
        
        if not token or not ip_address:
            return Response(
                {'error': 'token and ip_address are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        decoded = verify_jwt_token(token)
        if not decoded:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if decoded.get('ip') != ip_address:
            return Response(
                {'error': 'Token IP mismatch'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM token_managements
                WHERE expiry < %s
            """, [timezone.now()])
            
            cursor.execute("""
                SELECT token, generation_count, expiry
                FROM token_managements
                WHERE ip_address = %s
                AND expiry > %s
                ORDER BY created_at DESC
                LIMIT 1
            """, [ip_address, timezone.now()])
            
            row = cursor.fetchone()
            
            if row:
                existing_token, generation_count, expiry = row
                return Response({
                    'token': existing_token,
                    'generation_count': generation_count,
                    'expiry': expiry.isoformat() if expiry else None,
                }, status=status.HTTP_200_OK)
            else:
                expiry = timezone.now() + timedelta(hours=1)
                cursor.execute("""
                    INSERT INTO token_managements (token, ip_address, generation_count, expiry, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING token, generation_count, expiry
                """, [token, ip_address, 0, expiry, timezone.now(), timezone.now()])
                
                row = cursor.fetchone()
                if row:
                    new_token, generation_count, expiry = row
                    return Response({
                        'token': new_token,
                        'generation_count': generation_count,
                        'expiry': expiry.isoformat() if expiry else None,
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response(
                        {'error': 'Failed to create token'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def increment_generation_count(request):
    """Increment generation count for a token"""
    try:
        token = request.data.get('token')
        
        if not token:
            return Response(
                {'error': 'token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        decoded = verify_jwt_token(token)
        if not decoded:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ip_address = decoded.get('ip')
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, generation_count, expiry
                FROM token_managements
                WHERE token = %s
                AND ip_address = %s
                AND expiry > %s
            """, [token, ip_address, timezone.now()])
            
            row = cursor.fetchone()
            
            if not row:
                return Response(
                    {'error': 'Token not found or expired'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            token_id, current_count, expiry = row
            
            new_count = current_count + 1
            
            cursor.execute("""
                UPDATE token_managements
                SET generation_count = %s, updated_at = %s
                WHERE id = %s
            """, [new_count, timezone.now(), token_id])
            
            return Response({
                'generation_count': new_count,
                'expiry': expiry.isoformat() if expiry else None,
            }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def check_generation_limit(request):
    """Check if generation limit (5) has been reached for a token"""
    try:
        token = request.query_params.get('token')
        
        if not token:
            return Response(
                {'error': 'token parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        decoded = verify_jwt_token(token)
        if not decoded:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ip_address = decoded.get('ip')
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT generation_count, expiry
                FROM token_managements
                WHERE token = %s
                AND ip_address = %s
                AND expiry > %s
            """, [token, ip_address, timezone.now()])
            
            row = cursor.fetchone()
            
            if not row:
                return Response(
                    {'error': 'Token not found or expired'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            generation_count, expiry = row
            
            return Response({
                'generation_count': generation_count,
                'limit_reached': generation_count >= 5,
                'expiry': expiry.isoformat() if expiry else None,
            }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def cleanup_expired_tokens(request):
    """Delete expired tokens (can be called by a scheduled task)"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM token_managements
                WHERE expiry < %s
            """, [timezone.now()])
            
            deleted_count = cursor.rowcount
            
            return Response({
                'deleted_count': deleted_count,
                'message': f'Deleted {deleted_count} expired tokens'
            }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

