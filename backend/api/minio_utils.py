import os
from minio import Minio
from minio.error import S3Error


# MinIO configuration from environment variables
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT')
MINIO_PUBLIC_URL = os.getenv('MINIO_PUBLIC_URL')
MINIO_BUCKET = os.getenv('MINIO_BUCKET', 'resumes')
MINIO_REGION = os.getenv('MINIO_REGION', 'us-east-1')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY')
# Default to false for SSL (most MinIO instances, especially in Docker, don't use SSL by default)
MINIO_USE_SSL_STR = os.getenv('MINIO_USE_SSL', 'false').lower()
MINIO_USE_SSL = MINIO_USE_SSL_STR in ('true', '1', 'yes')


def parse_endpoint(endpoint: str):
    """Parse MinIO endpoint to extract host and port"""
    if not endpoint:
        return None, None
    
    clean_endpoint = endpoint.replace('http://', '').replace('https://', '')
    parts = clean_endpoint.split(':')
    host = parts[0] if parts and parts[0] else 'localhost'
    
    # Default port based on SSL
    default_port = 443 if MINIO_USE_SSL else 9000
    port = int(parts[1]) if len(parts) > 1 and parts[1] else default_port
    
    return host, port


def get_minio_client():
    """Get or create MinIO client"""
    if not MINIO_ENDPOINT:
        raise Exception('MINIO_ENDPOINT environment variable is not set')
    # if not MINIO_ACCESS_KEY or not MINIO_SECRET_KEY:
    #     raise Exception('MINIO_ACCESS_KEY and MINIO_SECRET_KEY environment variables are required')
    
    host, port = parse_endpoint(MINIO_ENDPOINT)
    if not host:
        raise Exception('Failed to parse MINIO_ENDPOINT')
    
    # MinIO client expects endpoint as "host:port" or just "host"
    endpoint = f"{host}:{port}" if port else host
    
    # Log configuration for debugging
    print(f'MinIO Configuration: endpoint={endpoint}, secure={MINIO_USE_SSL}, bucket={MINIO_BUCKET}')
    
    return Minio(
        endpoint=endpoint,
        secure=MINIO_USE_SSL
    )


# Initialize client lazily
minio_client = None


def ensure_bucket_exists(bucket_name: str):
    """Ensure bucket exists, create if it doesn't"""
    global minio_client
    if minio_client is None:
        minio_client = get_minio_client()
    
    try:
        found = minio_client.bucket_exists(bucket_name)
        if not found:
            minio_client.make_bucket(bucket_name, location=MINIO_REGION)
    except S3Error as e:
        print(f'Error ensuring bucket exists: {e}')
        raise
    except Exception as e:
        print(f'Error connecting to MinIO: {e}')
        raise


def upload_file(bucket_name: str, object_name: str, file_data: bytes, content_type: str):
    """
    Upload file to MinIO
    
    Args:
        bucket_name: Name of the bucket
        object_name: Object name (path) in bucket
        file_data: File data as bytes
        content_type: MIME type of the file
    
    Returns:
        Object name if successful
    """
    global minio_client
    if minio_client is None:
        minio_client = get_minio_client()
    
    try:
        # Ensure bucket exists
        ensure_bucket_exists(bucket_name)
        
        # Upload file
        from io import BytesIO
        file_buffer = BytesIO(file_data)
        
        minio_client.put_object(
            bucket_name,
            object_name,
            file_buffer,
            length=len(file_data),
            content_type=content_type
        )
        
        return object_name
    except S3Error as e:
        print(f'Error uploading file to MinIO: {e}')
        raise
    except Exception as e:
        print(f'Error uploading file to MinIO: {e}')
        raise


def get_public_url(bucket_name: str, object_name: str):
    """Generate public URL for uploaded file"""
    return f"{MINIO_PUBLIC_URL}/{bucket_name}/{object_name}"

