from django.urls import path
from . import views
from . import user_details_views
from . import resume_views

app_name = 'api'

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('test/', views.test, name='test'),
    path('users/', views.get_users, name='get_users'),
    path('users/check-or-create/', views.check_or_create_user, name='check_or_create_user'),
    path('chat/', views.chat, name='chat'),
    path('generate-resume/', resume_views.generate_resume, name='generate_resume'),
    path('users/<int:user_id>/details/', user_details_views.get_user_details, name='get_user_details'),
]

