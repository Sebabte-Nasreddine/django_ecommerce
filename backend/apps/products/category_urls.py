"""
Category URL patterns: mounted at /api/categories  (no trailing slash)
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.category_list_create, name='category-list'),
    path('/featured', views.featured_categories, name='category-featured'),
    path('/<int:pk>', views.category_detail, name='category-detail'),
    path('/<int:pk>/featured', views.toggle_category_featured, name='category-toggle-featured'),
]
