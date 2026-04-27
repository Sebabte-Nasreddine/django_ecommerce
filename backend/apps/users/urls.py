"""
Auth URL patterns: mounted at /api/auth/
"""
from django.urls import path
from . import views

urlpatterns = [
    path('register', views.register, name='auth-register'),
    path('login', views.login, name='auth-login'),
    path('admin/login', views.admin_login, name='auth-admin-login'),
    path('me', views.me, name='auth-me'),
]
