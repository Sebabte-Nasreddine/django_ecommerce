"""
Order URL patterns: mounted at /api/orders  (no trailing slash)
"""
from django.urls import path
from . import views

urlpatterns = [
    path('/checkout', views.checkout, name='order-checkout'),
    path('', views.order_list, name='order-list'),
    path('/<int:pk>', views.order_detail, name='order-detail'),
    path('/<int:pk>/status', views.update_order_status, name='order-status'),
    path('/<int:pk>/delete', views.delete_order, name='order-delete'),
    path('/guest-checkout', views.guest_checkout, name='guest-checkout'),
]
