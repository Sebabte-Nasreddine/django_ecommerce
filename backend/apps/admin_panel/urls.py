"""
Admin panel URL patterns: mounted at /api/admin/
"""
from django.urls import path
from . import views
from apps.products import views as product_views

urlpatterns = [
    path('stats', views.stats, name='admin-stats'),
    path('categories', views.admin_categories, name='admin-categories'),
    path('users', views.admin_users, name='admin-users'),
    path('users/<int:pk>', views.admin_delete_user, name='admin-delete-user'),
    path('orders', views.admin_orders, name='admin-orders'),
    path('promotions', views.promotions, name='admin-promotions'),
    path('promotions/<int:pk>', views.promotion_detail, name='admin-promotion-detail'),
    path('advertisements', views.admin_advertisements, name='admin-advertisements'),
    path('advertisements/<int:pk>', views.admin_advertisement_detail, name='admin-advertisement-detail'),
    path('upload-image', views.upload_image, name='admin-upload-image'),
    path('download-image/<str:filename>', views.download_image, name='admin-download-image'),
    path('shipping-settings', views.admin_shipping_settings, name='admin-shipping-settings'),
    path('banner', views.admin_banner, name='admin-banner'),
    path('reviews', product_views.admin_reviews, name='admin-reviews'),
    path('reviews/<int:review_id>/toggle', product_views.admin_review_toggle_active, name='admin-review-toggle'),
]
