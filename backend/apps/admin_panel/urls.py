"""
Admin panel URL patterns: mounted at /api/admin/
"""
from django.urls import path
from . import views

urlpatterns = [
    path('stats', views.stats, name='admin-stats'),
    path('categories', views.admin_categories, name='admin-categories'),
    path('users', views.admin_users, name='admin-users'),
    path('users/<int:pk>', views.admin_delete_user, name='admin-delete-user'),
    path('orders', views.admin_orders, name='admin-orders'),
    path('promotions', views.promotions, name='admin-promotions'),
    path('promotions/<int:pk>', views.promotion_detail, name='admin-promotion-detail'),
    path('upload-image', views.upload_image, name='admin-upload-image'),
    path('download-image/<str:filename>', views.download_image, name='admin-download-image'),
]
