"""
Cart views.

Cart is user-specific and auto-created on first access.
"""
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.products.models import Product, ProductSize, Size
from .models import Cart, CartItem
from .serializers import (
    AddToCartSerializer,
    CartSerializer,
    UpdateCartItemSerializer,
)


def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def cart_response(cart):
    """Reload cart with fresh prefetch and return serialized data."""
    cart.refresh_from_db()
    cart_fresh = Cart.objects.prefetch_related(
        'items__product',
        'items__size',
    ).get(pk=cart.pk)
    return CartSerializer(cart_fresh).data


# ── /api/cart ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def cart_view(request):
    cart = get_or_create_cart(request.user)

    if request.method == 'GET':
        return Response(cart_response(cart))

    # DELETE — clear the cart
    cart.items.all().delete()
    return Response(cart_response(cart))


# ── /api/cart/items ───────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    serializer = AddToCartSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    product_id = data['productId']
    quantity = data['quantity']
    size_name = data.get('sizeName')

    product = get_object_or_404(Product, pk=product_id, is_active=True)

    # Resolve size
    size = None
    if size_name:
        size = get_object_or_404(Size, name=size_name)
        # Check stock
        try:
            ps = ProductSize.objects.get(product=product, size=size)
            if ps.stock_quantity < quantity:
                return Response(
                    {'message': f'Only {ps.stock_quantity} units available.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ProductSize.DoesNotExist:
            return Response(
                {'message': 'This size is not available for this product.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    cart = get_or_create_cart(request.user)

    with transaction.atomic():
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            size=size,
            defaults={'unit_price': product.price, 'quantity': quantity},
        )
        if not created:
            item.quantity += quantity
            item.unit_price = product.price  # refresh price
            item.save(update_fields=['quantity', 'unit_price'])

    return Response(cart_response(cart))


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, item_id):
    cart = get_or_create_cart(request.user)
    item = get_object_or_404(CartItem, pk=item_id, cart=cart)

    if request.method == 'PUT':
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item.quantity = serializer.validated_data['quantity']
        item.save(update_fields=['quantity'])
        return Response(cart_response(cart))

    # DELETE
    item.delete()
    return Response(cart_response(cart))
