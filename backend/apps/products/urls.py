"""
Product URL patterns: mounted at /api/products  (no trailing slash)
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.product_list_create, name='product-list'),
    path('/check-stock', views.check_cart_stock, name='check-cart-stock'),
    path('/<int:pk>', views.product_detail, name='product-detail'),
    path('/slug/<slug:slug>', views.product_by_slug, name='product-by-slug'),
    path('/slug/<slug:slug>/related', views.related_products, name='product-related'),
    path('/<int:pk>/sizes', views.product_sizes, name='product-sizes'),
    path('/<int:pk>/sizes/stock', views.product_size_stock, name='product-size-stock'),
    path('/<int:pk>/sizes/<int:size_id>/stock', views.product_size_stock_by_id, name='product-size-stock-by-id'),
]
