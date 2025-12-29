from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.utils import timezone
import os
import re
from datetime import datetime
from urllib.parse import urlparse
from .minio_utils import upload_file, get_public_url, get_minio_client, MINIO_BUCKET, download_file


def convert_folder_path_to_key(cursor, profile_id, folder_path):
    """
    Convert folder_path (using folder names from UI) to folder_key.
    Returns folder_key string or None if not found.
    Example: "DevOps/Pipelines-rename" -> "DevOps/Pipelines" (uses folder_key, not folder_name)
    """
    if not folder_path:
        return ''
    
    folder_path = folder_path.strip('/')
    if not folder_path:
        return ''
    

    folder_names = folder_path.split('/')
    

    current_parent_key = None
    for folder_name in folder_names:

        if current_parent_key:

            cursor.execute(
                """
                SELECT folder_key FROM folders 
                WHERE profile_id = %s AND folder_name = %s 
                AND folder_key LIKE %s AND (deleted_at IS NULL)
                LIMIT 1
                """,
                [profile_id, folder_name, f"{current_parent_key}/%"]
            )
        else:

            cursor.execute(
                """
                SELECT folder_key FROM folders 
                WHERE profile_id = %s AND folder_name = %s 
                AND folder_key NOT LIKE %s AND (deleted_at IS NULL)
                LIMIT 1
                """,
                [profile_id, folder_name, '%/%']
            )
        
        folder_row = cursor.fetchone()
        if not folder_row:
            return None  # Folder not found
        

        current_parent_key = folder_row[0]
    

    return current_parent_key


@api_view(['POST'])
def upload_resume(request):
    """
    Upload resume file to MinIO and save entry to resumes table.
    Expects: user_id (via form data or JSON) and file (via form data)
    """
    try:

        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided. Please upload a file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        

        if file.size == 0:
            return Response(
                {'error': 'File is empty.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        max_file_size = 10 * 1024 * 1024  # 10MB in bytes
        if file.size > max_file_size:
            return Response(
                {'error': f'File size too large. Maximum size is 10MB. Your file is {file.size / (1024 * 1024):.2f}MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        allowed_extensions = ['.pdf', '.doc', '.docx']
        file_extension = os.path.splitext(file.name)[1].lower()
        
        if file_extension not in allowed_extensions:
            return Response(
                {'error': f'Invalid file type. Allowed types: {", ".join(allowed_extensions)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with connection.cursor() as cursor:

            cursor.execute("SELECT id, username FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            user_id_db, username = user_row
            

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
            


            folder_path = request.data.get('folder_path', '')
            

            folder_key = convert_folder_path_to_key(cursor, profile_id, folder_path)
            if folder_path and folder_key is None:
                return Response(
                    {'error': f'Folder with path "{folder_path}" does not exist. Please create the folder first.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            

            if folder_key:

                cursor.execute(
                    """
                    SELECT id FROM folders 
                    WHERE profile_id = %s AND folder_key = %s AND (deleted_at IS NULL)
                    """,
                    [profile_id, folder_key]
                )
                folder_exists = cursor.fetchone()
                
                if not folder_exists:
                    return Response(
                        {'error': f'Folder with key "{folder_key}" does not exist. Please create the folder first.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            

            file_data = file.read()
            file.seek(0)  # Reset file pointer
            


            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_filename = file.name.replace(' ', '_')
            
            if folder_key:
                object_name = f"{username}/resumes/{folder_key}/{timestamp}_{safe_filename}"
            else:

                object_name = f"{username}/resumes/{timestamp}_{safe_filename}"
            

            content_type_map = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
            content_type = content_type_map.get(file_extension, 'application/octet-stream')
            

            try:
                upload_file(MINIO_BUCKET, object_name, file_data, content_type)
            except Exception as e:
                return Response(
                    {'error': f'Failed to upload file to storage: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            

            public_url = get_public_url(MINIO_BUCKET, object_name)
            

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

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with connection.cursor() as cursor:

            cursor.execute("SELECT id FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            

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
            

            cursor.execute(
                """
                SELECT id, folder_name, folder_key, created_at, updated_at
                FROM folders
                WHERE profile_id = %s AND (deleted_at IS NULL)
                ORDER BY folder_key, created_at
                """,
                [profile_id]
            )
            folder_rows = cursor.fetchall()
            

            cursor.execute(
                """
                SELECT id, url, filename, created_at, updated_at
                FROM resumes
                WHERE profile_id = %s AND (deleted_at IS NULL)
                ORDER BY created_at DESC
                """,
                [profile_id]
            )
            resume_rows = cursor.fetchall()
            
            resumes = []
            folders = {}
            


            sorted_folders = sorted(folder_rows, key=lambda x: (x[2] or '').count('/'))
            

            folder_key_map = {}

            folder_key_to_structure = {}

            valid_folder_paths = set()
            for folder_row in sorted_folders:
                folder_id, folder_name, folder_key, folder_created_at, folder_updated_at = folder_row
                if folder_key:
                    folder_key_map[folder_key] = folder_key

                    path_parts = folder_key.split('/')
                    for i in range(1, len(path_parts) + 1):
                        valid_folder_paths.add('/'.join(path_parts[:i]))
            
            def ensure_folder_path(folder_structure, path_list, folder_key_map):
                """Ensure folder path exists in structure, return reference to the final folder's folders dict"""
                current = folder_structure
                current_path = []
                for folder_name in path_list:
                    current_path.append(folder_name)
                    current_key = '/'.join(current_path)
                    if folder_name not in current:
                        current[folder_name] = {'files': [], 'folders': {}, 'folder_key': folder_key_map.get(current_key)}
                    current = current[folder_name]['folders']
                return current
            
            for folder_row in sorted_folders:
                folder_id, folder_name, folder_key, folder_created_at, folder_updated_at = folder_row
                



                if folder_key:
                    path_parts = folder_key.split('/')
                    

                    if len(path_parts) > 1:

                        parent_path = path_parts[:-1]
                        target_location = ensure_folder_path(folders, parent_path, folder_key_map)
                    else:

                        target_location = folders
                    


                    if folder_name not in target_location:
                        target_location[folder_name] = {'files': [], 'folders': {}, 'folder_key': folder_key}

                    folder_key_to_structure[folder_key] = target_location[folder_name]
            
            def add_file_to_folder_by_key(folder_key_path, file_data):
                """Add file to folder by folder_key path (e.g., 'DevOps/Pipelines')
                Uses folder_key to match, not folder names, so renamed folders still work"""
                if not folder_key_path:
                    resumes.append(file_data)
                    return
                

                if folder_key_path in folder_key_to_structure:

                    folder_key_to_structure[folder_key_path]['files'].append(file_data)
                else:

                    resumes.append(file_data)
            

            for row in resume_rows:
                resume_id, url, filename, created_at, updated_at = row
                


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



                    remaining_parts = path_parts[2:]
                    

                    if remaining_parts and remaining_parts[0] == 'resumes':
                        remaining_parts = remaining_parts[1:]
                    
                    if len(remaining_parts) > 1:

                        folder_key_path = '/'.join(remaining_parts[:-1])  # e.g., "DevOps/Pipelines"
                        file_name = remaining_parts[-1]
                        file_data['filename'] = filename or file_name

                        add_file_to_folder_by_key(folder_key_path, file_data)
                    else:

                        file_data['filename'] = filename or remaining_parts[0]
                        resumes.append(file_data)
                elif len(path_parts) == 2:

                    file_data['filename'] = filename or path_parts[1]
                    resumes.append(file_data)
                else:

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
        

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        if not re.match(r'^[a-zA-Z0-9_-]+$', folder_name):
            return Response(
                {'error': 'Folder name can only contain letters, numbers, hyphens, and underscores'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with connection.cursor() as cursor:

            cursor.execute("SELECT id, username FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            user_id_db, username = user_row
            

            base_path = f"{username}/resumes"
            if parent_folder:
                folder_path = f"{base_path}/{parent_folder}/{folder_name}"
                object_name = f"{base_path}/{parent_folder}/{folder_name}/.keep"  # Create a placeholder file
                folder_key = f"{parent_folder}/{folder_name}"
            else:
                folder_path = f"{base_path}/{folder_name}"
                object_name = f"{base_path}/{folder_name}/.keep"  # Create a placeholder file
                folder_key = folder_name
            

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
            

            try:
                minio_client = get_minio_client()
                

                prefix_to_check = f"{base_path}/{parent_folder}/{folder_name}/" if parent_folder else f"{base_path}/{folder_name}/"
                found_objects = list(minio_client.list_objects(MINIO_BUCKET, prefix=prefix_to_check, recursive=False))
                
                if found_objects:
                    return Response(
                        {'error': f'Folder "{folder_name}" already exists at this location'},
                        status=status.HTTP_409_CONFLICT
                    )
            except Exception as e:


                print(f"Error checking folder existence in MinIO: {e}")
            

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


@api_view(['POST'])
def rename_file(request):
    """
    Rename a file in the resumes table.
    Expects: user_id, resume_id, new_filename
    If filename exists for that user, increments like test(1), test(2), etc.
    """
    try:
        user_id = request.data.get('user_id')
        resume_id = request.data.get('resume_id')
        new_filename = request.data.get('new_filename')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not resume_id:
            return Response(
                {'error': 'resume_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not new_filename:
            return Response(
                {'error': 'new_filename is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            resume_id_int = int(resume_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid resume_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        new_filename = new_filename.strip()
        if not new_filename:
            return Response(
                {'error': 'Filename cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        


        file_extension = os.path.splitext(new_filename)[1]
        base_name = os.path.splitext(new_filename)[0]

        base_name = re.sub(r'[^a-zA-Z0-9_-]', '_', base_name)
        if not base_name:
            base_name = 'file'
        new_filename = base_name + file_extension if file_extension else base_name
        
        with connection.cursor() as cursor:

            cursor.execute("SELECT id FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            

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
            

            cursor.execute(
                """
                SELECT id, filename FROM resumes 
                WHERE id = %s AND profile_id = %s
                """,
                [resume_id_int, profile_id]
            )
            resume_row = cursor.fetchone()
            
            if not resume_row:
                return Response(
                    {'error': f'Resume with id {resume_id_int} not found or does not belong to this user.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            


            final_filename = new_filename
            counter = 0
            
            while True:
                cursor.execute(
                    """
                    SELECT id FROM resumes 
                    WHERE profile_id = %s AND filename = %s AND id != %s
                    """,
                    [profile_id, final_filename, resume_id_int]
                )
                existing_resume = cursor.fetchone()
                
                if not existing_resume:

                    break
                

                counter += 1
                base_name_without_ext = os.path.splitext(new_filename)[0]
                file_ext = os.path.splitext(new_filename)[1]
                final_filename = f"{base_name_without_ext}({counter}){file_ext}"
            

            cursor.execute(
                """
                UPDATE resumes 
                SET filename = %s, updated_at = %s
                WHERE id = %s AND profile_id = %s
                RETURNING id, filename
                """,
                [final_filename, timezone.now(), resume_id_int, profile_id]
            )
            updated_row = cursor.fetchone()
            
            if not updated_row:
                return Response(
                    {'error': 'Failed to update filename'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'success': True,
                'message': 'File renamed successfully',
                'resume_id': updated_row[0],
                'filename': updated_row[1]
            }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def delete_file(request):
    """
    Soft delete a file by updating deleted_at in the resumes table.
    Expects: user_id, resume_id
    No change to the bucket path - just marks as deleted in database.
    """
    try:
        user_id = request.data.get('user_id')
        resume_id = request.data.get('resume_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not resume_id:
            return Response(
                {'error': 'resume_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            resume_id_int = int(resume_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid resume_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with connection.cursor() as cursor:

            cursor.execute("SELECT id FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            

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
            

            cursor.execute(
                """
                SELECT id, filename FROM resumes 
                WHERE id = %s AND profile_id = %s
                """,
                [resume_id_int, profile_id]
            )
            resume_row = cursor.fetchone()
            
            if not resume_row:
                return Response(
                    {'error': f'Resume with id {resume_id_int} not found or does not belong to this user.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            

            cursor.execute(
                """
                SELECT deleted_at FROM resumes 
                WHERE id = %s AND profile_id = %s
                """,
                [resume_id_int, profile_id]
            )
            resume_status = cursor.fetchone()
            
            if resume_status and resume_status[0] is not None:
                return Response(
                    {'error': 'File is already deleted.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            

            cursor.execute(
                """
                UPDATE resumes 
                SET deleted_at = %s, updated_at = %s
                WHERE id = %s AND profile_id = %s
                RETURNING id, filename
                """,
                [timezone.now(), timezone.now(), resume_id_int, profile_id]
            )
            updated_row = cursor.fetchone()
            
            if not updated_row:
                return Response(
                    {'error': 'Failed to delete file'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'success': True,
                'message': 'File deleted successfully',
                'resume_id': updated_row[0],
                'filename': updated_row[1]
            }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def copy_file(request):
    """
    Copy a file to a new location (same as upload resume flow).
    Downloads the original file from MinIO and uploads it again with timestamp.
    Expects: user_id, resume_id, folder_path (optional)
    """
    try:
        user_id = request.data.get('user_id')
        resume_id = request.data.get('resume_id')
        folder_path = request.data.get('folder_path', '')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not resume_id:
            return Response(
                {'error': 'resume_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            resume_id_int = int(resume_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid resume_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with connection.cursor() as cursor:

            cursor.execute("SELECT id, username FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            user_id_db, username = user_row
            

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
            

            folder_key = convert_folder_path_to_key(cursor, profile_id, folder_path)
            if folder_path and folder_key is None:
                return Response(
                    {'error': f'Folder with path "{folder_path}" does not exist. Please create the folder first.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            

            if folder_key:

                cursor.execute(
                    """
                    SELECT id FROM folders 
                    WHERE profile_id = %s AND folder_key = %s AND (deleted_at IS NULL)
                    """,
                    [profile_id, folder_key]
                )
                folder_exists = cursor.fetchone()
                
                if not folder_exists:
                    return Response(
                        {'error': f'Folder with key "{folder_key}" does not exist. Please create the folder first.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            

            cursor.execute(
                """
                SELECT id, url, filename FROM resumes 
                WHERE id = %s AND profile_id = %s AND (deleted_at IS NULL)
                """,
                [resume_id_int, profile_id]
            )
            resume_row = cursor.fetchone()
            
            if not resume_row:
                return Response(
                    {'error': f'Resume with id {resume_id_int} not found, does not belong to this user, or is deleted.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            resume_id_orig, original_url, original_filename = resume_row
            


            parsed_url = urlparse(original_url)
            path_parts = [p for p in parsed_url.path.strip('/').split('/') if p]
            

            if len(path_parts) > 0:

                object_name = '/'.join(path_parts[1:]) if len(path_parts) > 1 else path_parts[0]
            else:
                return Response(
                    {'error': 'Invalid file URL format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            

            try:
                file_data = download_file(MINIO_BUCKET, object_name)
            except Exception as e:
                return Response(
                    {'error': f'Failed to download file from storage: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            

            file_extension = os.path.splitext(original_filename)[1].lower()
            

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_filename = original_filename.replace(' ', '_')
            
            if folder_key:
                new_object_name = f"{username}/resumes/{folder_key}/{timestamp}_{safe_filename}"
            else:

                new_object_name = f"{username}/resumes/{timestamp}_{safe_filename}"
            

            content_type_map = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
            content_type = content_type_map.get(file_extension, 'application/octet-stream')
            

            try:
                upload_file(MINIO_BUCKET, new_object_name, file_data, content_type)
            except Exception as e:
                return Response(
                    {'error': f'Failed to upload copied file to storage: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            

            public_url = get_public_url(MINIO_BUCKET, new_object_name)
            

            try:
                cursor.execute(
                    """
                    INSERT INTO resumes (profile_id, url, filename, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    [profile_id, public_url, safe_filename, timezone.now(), timezone.now()]
                )
                new_resume_id = cursor.fetchone()[0]
                
                return Response({
                    'success': True,
                    'message': 'File copied successfully',
                    'resume_id': new_resume_id,
                    'url': public_url,
                    'filename': safe_filename,
                    'profile_id': profile_id
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to save copied file record: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def move_file(request):
    """
    Move a file to a new location.
    First copies the file (same as copy_file), then deletes the original (same as delete_file).
    Expects: user_id, resume_id, folder_path (optional)
    """
    try:
        user_id = request.data.get('user_id')
        resume_id = request.data.get('resume_id')
        folder_path = request.data.get('folder_path', '')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not resume_id:
            return Response(
                {'error': 'resume_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            resume_id_int = int(resume_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid resume_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        


        with connection.cursor() as cursor:

            cursor.execute("SELECT id, username FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            user_id_db, username = user_row
            

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
            

            folder_key = convert_folder_path_to_key(cursor, profile_id, folder_path)
            if folder_path and folder_key is None:
                return Response(
                    {'error': f'Folder with path "{folder_path}" does not exist. Please create the folder first.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            

            if folder_key:

                cursor.execute(
                    """
                    SELECT id FROM folders 
                    WHERE profile_id = %s AND folder_key = %s AND (deleted_at IS NULL)
                    """,
                    [profile_id, folder_key]
                )
                folder_exists = cursor.fetchone()
                
                if not folder_exists:
                    return Response(
                        {'error': f'Folder with key "{folder_key}" does not exist. Please create the folder first.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            

            cursor.execute(
                """
                SELECT id, url, filename FROM resumes 
                WHERE id = %s AND profile_id = %s AND (deleted_at IS NULL)
                """,
                [resume_id_int, profile_id]
            )
            resume_row = cursor.fetchone()
            
            if not resume_row:
                return Response(
                    {'error': f'Resume with id {resume_id_int} not found, does not belong to this user, or is deleted.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            resume_id_orig, original_url, original_filename = resume_row
            

            parsed_url = urlparse(original_url)
            path_parts = [p for p in parsed_url.path.strip('/').split('/') if p]
            

            if len(path_parts) > 0:
                object_name = '/'.join(path_parts[1:]) if len(path_parts) > 1 else path_parts[0]
            else:
                return Response(
                    {'error': 'Invalid file URL format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            

            try:
                file_data = download_file(MINIO_BUCKET, object_name)
            except Exception as e:
                return Response(
                    {'error': f'Failed to download file from storage: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            

            file_extension = os.path.splitext(original_filename)[1].lower()
            

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_filename = original_filename.replace(' ', '_')
            
            if folder_key:
                new_object_name = f"{username}/resumes/{folder_key}/{timestamp}_{safe_filename}"
            else:
                new_object_name = f"{username}/resumes/{timestamp}_{safe_filename}"
            

            content_type_map = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
            content_type = content_type_map.get(file_extension, 'application/octet-stream')
            

            try:
                upload_file(MINIO_BUCKET, new_object_name, file_data, content_type)
            except Exception as e:
                return Response(
                    {'error': f'Failed to upload moved file to storage: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            

            public_url = get_public_url(MINIO_BUCKET, new_object_name)
            

            try:
                cursor.execute(
                    """
                    INSERT INTO resumes (profile_id, url, filename, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    [profile_id, public_url, safe_filename, timezone.now(), timezone.now()]
                )
                new_resume_id = cursor.fetchone()[0]
            except Exception as e:
                return Response(
                    {'error': f'Failed to save moved file record: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            

            try:
                cursor.execute(
                    """
                    UPDATE resumes 
                    SET deleted_at = %s, updated_at = %s
                    WHERE id = %s AND profile_id = %s
                    RETURNING id, filename
                    """,
                    [timezone.now(), timezone.now(), resume_id_int, profile_id]
                )
                deleted_row = cursor.fetchone()
                
                if not deleted_row:


                    return Response(
                        {'error': 'File was copied but failed to delete original. Please contact support.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            except Exception as e:
                return Response(
                    {'error': f'File was copied but failed to delete original: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'success': True,
                'message': 'File moved successfully',
                'new_resume_id': new_resume_id,
                'old_resume_id': resume_id_int,
                'url': public_url,
                'filename': safe_filename,
                'profile_id': profile_id
            }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def rename_folder(request):
    """
    Rename a folder in the folders table.
    Expects: user_id, folder_key, new_folder_name
    Updates folder_name in database, keeps folder_key same.
    """
    try:
        user_id = request.data.get('user_id')
        folder_key = request.data.get('folder_key')
        new_folder_name = request.data.get('new_folder_name')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not folder_key:
            return Response(
                {'error': 'folder_key is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not new_folder_name:
            return Response(
                {'error': 'new_folder_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        if not re.match(r'^[a-zA-Z0-9_-]+$', new_folder_name):
            return Response(
                {'error': 'Folder name can only contain letters, numbers, hyphens, and underscores'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        new_folder_name = new_folder_name.strip()
        if not new_folder_name:
            return Response(
                {'error': 'Folder name cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with connection.cursor() as cursor:

            cursor.execute("SELECT id FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            

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
            

            cursor.execute(
                """
                SELECT id, folder_name FROM folders 
                WHERE profile_id = %s AND folder_key = %s AND (deleted_at IS NULL)
                """,
                [profile_id, folder_key]
            )
            folder_row = cursor.fetchone()
            
            if not folder_row:
                return Response(
                    {'error': f'Folder with key "{folder_key}" not found, does not belong to this user, or is deleted.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            folder_id, old_folder_name = folder_row
            

            cursor.execute(
                """
                UPDATE folders 
                SET folder_name = %s, updated_at = %s
                WHERE id = %s AND profile_id = %s
                RETURNING id, folder_name, folder_key
                """,
                [new_folder_name, timezone.now(), folder_id, profile_id]
            )
            updated_row = cursor.fetchone()
            
            if not updated_row:
                return Response(
                    {'error': 'Failed to update folder name'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'success': True,
                'message': 'Folder renamed successfully',
                'folder_id': updated_row[0],
                'folder_name': updated_row[1],
                'folder_key': updated_row[2]
            }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def delete_folder(request):
    """
    Soft delete a folder by updating deleted_at in the folders table.
    Expects: user_id, folder_key
    """
    try:
        user_id = request.data.get('user_id')
        folder_key = request.data.get('folder_key')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not folder_key:
            return Response(
                {'error': 'folder_key is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid user_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with connection.cursor() as cursor:

            cursor.execute("SELECT id FROM users WHERE id = %s", [user_id_int])
            user_row = cursor.fetchone()
            
            if not user_row:
                return Response(
                    {'error': f'User with id {user_id_int} does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            

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
            

            cursor.execute(
                """
                SELECT id, folder_name FROM folders 
                WHERE profile_id = %s AND folder_key = %s AND (deleted_at IS NULL)
                """,
                [profile_id, folder_key]
            )
            folder_row = cursor.fetchone()
            
            if not folder_row:
                return Response(
                    {'error': f'Folder with key "{folder_key}" not found, does not belong to this user, or is already deleted.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            folder_id, folder_name = folder_row
            

            cursor.execute(
                """
                UPDATE folders 
                SET deleted_at = %s, updated_at = %s
                WHERE id = %s AND profile_id = %s
                RETURNING id, folder_name, folder_key
                """,
                [timezone.now(), timezone.now(), folder_id, profile_id]
            )
            updated_row = cursor.fetchone()
            
            if not updated_row:
                return Response(
                    {'error': 'Failed to delete folder'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'success': True,
                'message': 'Folder deleted successfully',
                'folder_id': updated_row[0],
                'folder_name': updated_row[1],
                'folder_key': updated_row[2]
            }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

