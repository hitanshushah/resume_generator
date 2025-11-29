from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.utils import timezone
import os
import re
from datetime import datetime
from urllib.parse import urlparse
from .minio_utils import upload_file, get_public_url, get_minio_client, MINIO_BUCKET


@api_view(['POST'])
def upload_resume(request):
    """
    Upload resume file to MinIO and save entry to resumes table.
    Expects: user_id (via form data or JSON) and file (via form data)
    """
    try:
        # Get user_id from form data
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
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
        
        # Get file from request
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided. Please upload a file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        
        # Validate file
        if file.size == 0:
            return Response(
                {'error': 'File is empty.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (max 10MB)
        max_file_size = 10 * 1024 * 1024  # 10MB in bytes
        if file.size > max_file_size:
            return Response(
                {'error': f'File size too large. Maximum size is 10MB. Your file is {file.size / (1024 * 1024):.2f}MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get allowed file types (PDF, DOC, DOCX)
        allowed_extensions = ['.pdf', '.doc', '.docx']
        file_extension = os.path.splitext(file.name)[1].lower()
        
        if file_extension not in allowed_extensions:
            return Response(
                {'error': f'Invalid file type. Allowed types: {", ".join(allowed_extensions)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with connection.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id, username FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            user_id_db, username = user_row
            
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
            
            # Get folder path from request (optional - empty means root level in resumes/)
            folder_path = request.data.get('folder_path', '')
            
            # Ensure folder_path doesn't start or end with / if provided
            if folder_path:
                folder_path = folder_path.strip('/')
            
            # If folder_path is provided, verify that the folder exists in the folders table
            if folder_path:
                cursor.execute(
                    """
                    SELECT id FROM folders 
                    WHERE profile_id = %s AND folder_key = %s
                    """,
                    [profile_id, folder_path]
                )
                folder_exists = cursor.fetchone()
                
                if not folder_exists:
                    return Response(
                        {'error': f'Folder with path "{folder_path}" does not exist. Please create the folder first.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Prepare file for upload
            file_data = file.read()
            file.seek(0)  # Reset file pointer
            
            # Generate object name: username/resumes/[folder_path/]timestamp_filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_filename = file.name.replace(' ', '_')
            
            if folder_path:
                object_name = f"{username}/resumes/{folder_path}/{timestamp}_{safe_filename}"
            else:
                # Root level - store directly in resumes folder
                object_name = f"{username}/resumes/{timestamp}_{safe_filename}"
            
            # Determine content type
            content_type_map = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
            content_type = content_type_map.get(file_extension, 'application/octet-stream')
            
            # Upload file to MinIO
            try:
                upload_file(MINIO_BUCKET, object_name, file_data, content_type)
            except Exception as e:
                return Response(
                    {'error': f'Failed to upload file to storage: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Generate public URL
            public_url = get_public_url(MINIO_BUCKET, object_name)
            
            # Save to resumes table
            try:
                cursor.execute(
                    """
                    INSERT INTO resumes (profile_id, url, filename, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    [profile_id, public_url, safe_filename, timezone.now(), timezone.now()]
                )
                resume_id = cursor.fetchone()[0]
                
                return Response({
                    'success': True,
                    'message': 'Resume uploaded successfully',
                    'resume_id': resume_id,
                    'url': public_url,
                    'filename': safe_filename,
                    'profile_id': profile_id
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                # If database insert fails, we should ideally delete the uploaded file
                # For now, just return error
                return Response(
                    {'error': f'Failed to save resume record: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_resumes(request, user_id):
    """
    Get all resumes for a user, organized by folder structure.
    """
    try:
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
            
            # Get profile_id
            cursor.execute(
                "SELECT id FROM profiles WHERE user_id = %s LIMIT 1",
                [user_id_int]
            )
            profile_row = cursor.fetchone()
            
            if not profile_row:
                return Response(
                    {'resumes': [], 'folders': {}},
                    status=status.HTTP_200_OK
                )
            
            profile_id = profile_row[0]
            
            # Get all folders from folders table for this profile
            cursor.execute(
                """
                SELECT id, folder_name, folder_key, created_at, updated_at
                FROM folders
                WHERE profile_id = %s
                ORDER BY folder_key, created_at
                """,
                [profile_id]
            )
            folder_rows = cursor.fetchall()
            
            # Get all resumes for this profile
            cursor.execute(
                """
                SELECT id, url, filename, created_at, updated_at
                FROM resumes
                WHERE profile_id = %s
                ORDER BY created_at DESC
                """,
                [profile_id]
            )
            resume_rows = cursor.fetchall()
            
            resumes = []
            folders = {}
            
            def ensure_folder_path(folder_structure, path_list):
                """Ensure folder path exists in structure, return reference to the final folder's folders dict"""
                current = folder_structure
                for folder_name in path_list:
                    if folder_name not in current:
                        current[folder_name] = {'files': [], 'folders': {}}
                    current = current[folder_name]['folders']
                return current
            
            # Build folder structure from folders table
            # Sort folders by depth (shallowest first) to ensure parents are created before children
            sorted_folders = sorted(folder_rows, key=lambda x: (x[2] or '').count('/'))
            
            for folder_row in sorted_folders:
                folder_id, folder_name, folder_key, folder_created_at, folder_updated_at = folder_row
                
                # Parse folder_key to build nested structure
                # folder_key format: "folder1" for root level, or "folder1/subfolder" for nested
                # The folder_key contains the full path, and folder_name is just the folder name
                if folder_key:
                    path_parts = folder_key.split('/')
                    
                    # Navigate to the parent folder structure
                    if len(path_parts) > 1:
                        # Nested folder: path_parts[:-1] are parent folders
                        parent_path = path_parts[:-1]
                        target_location = ensure_folder_path(folders, parent_path)
                    else:
                        # Root level folder
                        target_location = folders
                    
                    # Use folder_name (from database) as the key, not the last part of folder_key
                    # This ensures consistency even if folder_key format changes
                    if folder_name not in target_location:
                        target_location[folder_name] = {'files': [], 'folders': {}}
            
            def add_file_to_folder(folder_structure, path_list, file_data):
                """Add file to folder by path list"""
                if not path_list:
                    resumes.append(file_data)
                    return
                
                # Navigate to the target folder
                current = folder_structure
                for i, folder_name in enumerate(path_list):
                    if folder_name not in current:
                        # Folder doesn't exist in structure - might not be in folders table
                        # Create it temporarily for display
                        current[folder_name] = {'files': [], 'folders': {}}
                    if i == len(path_list) - 1:
                        # Last folder - add file here
                        current[folder_name]['files'].append(file_data)
                    else:
                        # Navigate deeper
                        current = current[folder_name]['folders']
            
            # Populate files into folders based on their URLs
            for row in resume_rows:
                resume_id, url, filename, created_at, updated_at = row
                
                # Parse URL to extract folder structure
                # URL format: http://minio/bucket/username/resumes/folder/subfolder/file.pdf
                parsed_url = urlparse(url)
                path_parts = [p for p in parsed_url.path.strip('/').split('/') if p]
                
                file_data = {
                    'id': resume_id,
                    'filename': filename or 'unknown',
                    'url': url,
                    'created_at': created_at.isoformat() if created_at else None,
                    'updated_at': updated_at.isoformat() if updated_at else None
                }
                
                if len(path_parts) > 2:
                    # path_parts[0] is bucket name, skip it
                    # path_parts[1] is username (skip it too for display)
                    # Rest is: resumes/folder/subfolder/.../filename
                    remaining_parts = path_parts[2:]
                    
                    # Skip "resumes" prefix if present (it's just a container, not a real folder)
                    if remaining_parts and remaining_parts[0] == 'resumes':
                        remaining_parts = remaining_parts[1:]
                    
                    if len(remaining_parts) > 1:
                        # Has folders: remaining_parts[:-1] are folders, last is filename
                        folder_path = remaining_parts[:-1]
                        file_name = remaining_parts[-1]
                        file_data['filename'] = filename or file_name
                        add_file_to_folder(folders, folder_path, file_data)
                    else:
                        # Just filename, no folders (bucket/username/resumes/file.pdf)
                        file_data['filename'] = filename or remaining_parts[0]
                        resumes.append(file_data)
                elif len(path_parts) == 2:
                    # bucket/filename (no username)
                    file_data['filename'] = filename or path_parts[1]
                    resumes.append(file_data)
                else:
                    # Just bucket or invalid path
                    file_data['filename'] = filename or 'unknown'
                    resumes.append(file_data)
            
            return Response({
                'resumes': resumes,  # Root level files
                'folders': folders   # Folder structure
            }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def create_folder(request):
    """
    Create a new folder in MinIO for a user.
    Expects: user_id, folder_name, parent_folder (optional)
    """
    try:
        user_id = request.data.get('user_id')
        folder_name = request.data.get('folder_name')
        parent_folder = request.data.get('parent_folder', '')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not folder_name:
            return Response(
                {'error': 'folder_name is required'},
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
        
        # Validate folder name (no special characters except - and _)
        if not re.match(r'^[a-zA-Z0-9_-]+$', folder_name):
            return Response(
                {'error': 'Folder name can only contain letters, numbers, hyphens, and underscores'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with connection.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id, username FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            user_id_db, username = user_row
            
            # Build folder path - all folders go under username/resumes/
            base_path = f"{username}/resumes"
            if parent_folder:
                folder_path = f"{base_path}/{parent_folder}/{folder_name}"
                object_name = f"{base_path}/{parent_folder}/{folder_name}/.keep"  # Create a placeholder file
                folder_key = f"{parent_folder}/{folder_name}"
            else:
                folder_path = f"{base_path}/{folder_name}"
                object_name = f"{base_path}/{folder_name}/.keep"  # Create a placeholder file
                folder_key = folder_name
            
            # Get profile_id first (needed for database checks)
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
            
            # Check if folder already exists in database
            cursor.execute(
                """
                SELECT id FROM folders 
                WHERE profile_id = %s AND folder_key = %s
                """,
                [profile_id, folder_key]
            )
            existing_folder = cursor.fetchone()
            
            if existing_folder:
                return Response(
                    {'error': f'Folder "{folder_name}" already exists at this location'},
                    status=status.HTTP_409_CONFLICT
                )
            
            # Also check if folder already exists in MinIO
            try:
                minio_client = get_minio_client()
                
                # Check if any object exists with this prefix (indicating folder exists)
                prefix_to_check = f"{base_path}/{parent_folder}/{folder_name}/" if parent_folder else f"{base_path}/{folder_name}/"
                found_objects = list(minio_client.list_objects(MINIO_BUCKET, prefix=prefix_to_check, recursive=False))
                
                if found_objects:
                    return Response(
                        {'error': f'Folder "{folder_name}" already exists at this location'},
                        status=status.HTTP_409_CONFLICT
                    )
            except Exception as e:
                # If MinIO check fails, continue with creation attempt
                # The upload will fail if there's an actual conflict
                print(f"Error checking folder existence in MinIO: {e}")
            
            # Create placeholder file in MinIO to create the folder structure
            try:
                placeholder_content = b""  # Empty file
                upload_file(
                    MINIO_BUCKET,
                    object_name,
                    placeholder_content,
                    'text/plain'
                )
            except Exception as e:
                return Response(
                    {'error': f'Failed to create folder in storage: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Save folder to folders table
            # folder_key is already calculated above (relative path without username/resumes prefix)
            try:
                cursor.execute(
                    """
                    INSERT INTO folders (profile_id, folder_name, folder_key, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    [profile_id, folder_name, folder_key, timezone.now(), timezone.now()]
                )
                folder_id = cursor.fetchone()[0]
            except Exception as e:
                # If database insert fails, log error but folder is already created in MinIO
                # We'll return success since MinIO folder creation succeeded
                print(f'Warning: Failed to save folder record to database: {str(e)}')
                folder_id = None
            
            return Response({
                'success': True,
                'message': 'Folder created successfully',
                'folder_path': folder_path,
                'folder_key': folder_key,
                'folder_id': folder_id
            }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

