"""
Cart URL patterns: mounted at /api/cart  (no trailing slash)
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.cart_view, name='cart'),
    path('/items', views.add_to_cart, name='cart-add-item'),
    path('/items/<int:item_id>', views.update_cart_item, name='cart-item-detail'),
]
