"""
Size URL patterns: mounted at /api/sizes  (no trailing slash)
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.size_list_create, name='size-list'),
    path('/<int:pk>', views.size_delete, name='size-delete'),
]
