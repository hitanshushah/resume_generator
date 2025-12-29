from django.urls import path
from . import views
from . import user_details_views
from . import resume_views
from . import template_views
from . import file_storage_views
from . import token_management_views

app_name = 'api'

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('test/', views.test, name='test'),
    path('users/', views.get_users, name='get_users'),
    path('users/check-or-create/', views.check_or_create_user, name='check_or_create_user'),
    path('chat/', views.chat, name='chat'),
    path('generate-resume/', resume_views.generate_resume, name='generate_resume'),
    path('upload-resume/', file_storage_views.upload_resume, name='upload_resume'),
    path('create-folder/', file_storage_views.create_folder, name='create_folder'),
    path('rename-file/', file_storage_views.rename_file, name='rename_file'),
    path('delete-file/', file_storage_views.delete_file, name='delete_file'),
    path('copy-file/', file_storage_views.copy_file, name='copy_file'),
    path('move-file/', file_storage_views.move_file, name='move_file'),
    path('rename-folder/', file_storage_views.rename_folder, name='rename_folder'),
    path('delete-folder/', file_storage_views.delete_folder, name='delete_folder'),
    path('users/<int:user_id>/resumes/', file_storage_views.get_resumes, name='get_resumes'),
    path('users/<int:user_id>/details/', user_details_views.get_user_details, name='get_user_details'),
    path('save-template/', template_views.save_template, name='save_template'),
    path('restore-default-template/', template_views.restore_default_template, name='restore_default_template'),
    path('token-management/', token_management_views.create_or_get_token, name='create_or_get_token'),
    path('token-management/get/', token_management_views.get_token_by_ip, name='get_token_by_ip'),
    path('token-management/increment/', token_management_views.increment_generation_count, name='increment_generation_count'),
    path('token-management/check/', token_management_views.check_generation_limit, name='check_generation_limit'),
    path('token-management/cleanup/', token_management_views.cleanup_expired_tokens, name='cleanup_expired_tokens'),
]

