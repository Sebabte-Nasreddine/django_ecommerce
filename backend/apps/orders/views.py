"""
Order views.
"""
import json
import logging
import os
import threading
import urllib.parse
import urllib.request
from decimal import Decimal
from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.cart.models import Cart
from apps.products.models import ProductSize
from apps.products.views import invalidate_product_cache
from apps.users.models import Address
from core.permissions import IsAdmin
from apps.products.models import Product
from .models import Order, OrderItem, Promotion
from .serializers import CheckoutSerializer, GuestCheckoutSerializer, OrderSerializer, PromotionSerializer

logger = logging.getLogger(__name__)


def send_telegram_notification(order):
    """Send Telegram message when a new order is placed."""
    token    = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    chat_ids_raw = os.environ.get('TELEGRAM_CHAT_IDS', os.environ.get('TELEGRAM_CHAT_ID', ''))
    if not token or not chat_ids_raw:
        return
    chat_ids = [cid.strip() for cid in chat_ids_raw.split(',') if cid.strip()]

    def _send():
        try:
            # Client info — registered user or guest
            if order.user:
                client_name = (
                    f"{order.user.first_name} {order.user.last_name}".strip()
                    or order.user.email
                )
                client_contact = f"  Email : {order.user.email}\n"
                if order.address:
                    client_contact += f"  Tél : {order.address.phone}\n"
                addr_lines = ""
                if order.address:
                    addr = order.address
                    addr_lines = (
                        f"  {addr.full_name}\n"
                        f"  {addr.street}\n"
                        f"  {addr.postal_code} {addr.city}\n"
                        f"  {addr.country}\n"
                    )
            else:
                client_name = order.guest_name or 'Client invité'
                client_contact = f"  Tél : {order.guest_phone}\n"
                addr_lines = (
                    f"  {order.guest_name}\n"
                    f"  {order.guest_address}\n"
                    f"  {order.guest_city}\n"
                    f"  Maroc\n"
                )

            items = list(order.items.all())
            items_lines = '\n'.join(
                f"  • {i.product_name}"
                + (f" ({i.size_name})" if i.size_name else '')
                + f"  ×{i.quantity}  —  {i.unit_price} DH"
                + f" = {(i.unit_price * i.quantity):.2f} DH"
                for i in items
            )
            order_date = order.created_at.strftime('%d/%m/%Y à %H:%M')

            text = (
                f"🛍 <b>Nouvelle commande #{order.id}</b>\n"
                f"📅 {order_date}\n"
                f"━━━━━━━━━━━━━━━━━━━━\n\n"
                f"👤 <b>Client</b>\n"
                f"  Nom : {client_name}\n"
                f"{client_contact}\n"
                f"📍 <b>Adresse de livraison</b>\n"
                f"{addr_lines}\n"
                f"🛒 <b>Articles</b>\n{items_lines}\n\n"
                f"💳 <b>Récapitulatif</b>\n"
                f"  Sous-total : {order.subtotal} DH\n"
                f"  Livraison : Gratuite 🎁\n"
                f"  Paiement : À la livraison 💵\n"
                + (f"  Remise : -{order.discount_amount} DH 🏷 <code>{order.promo_code_used}</code>\n" if order.discount_amount else '')
                + f"  <b>Total : {order.total} DH</b>\n"
                + (f"\n📝 Note : {order.notes}\n" if order.notes else '')
            )

            url = f"https://api.telegram.org/bot{token}/sendMessage"
            for cid in chat_ids:
                try:
                    payload = json.dumps({
                        'chat_id': cid,
                        'text': text,
                        'parse_mode': 'HTML',
                    }).encode('utf-8')
                    req = urllib.request.Request(
                        url,
                        data=payload,
                        headers={'Content-Type': 'application/json'},
                        method='POST',
                    )
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        logger.info("Telegram notification sent to %s, status=%s", cid, resp.status)
                except Exception as exc:
                    logger.warning("Telegram notification failed for %s: %s", cid, exc)

        except Exception as exc:
            logger.warning("Telegram notification build failed: %s", exc)

    threading.Thread(target=_send, daemon=True).start()


# Shipping cost rules
SHIPPING_COSTS = {
    'STANDARD': Decimal('4.99'),
    'EXPRESS': Decimal('9.99'),
}
FREE_SHIPPING_THRESHOLD = Decimal('50.00')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkout(request):
    serializer = CheckoutSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    address = get_object_or_404(Address, pk=data['addressId'], user=request.user)

    try:
        cart = Cart.objects.prefetch_related('items__product', 'items__size').get(user=request.user)
    except Cart.DoesNotExist:
        return Response({'message': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

    cart_items = list(cart.items.all())
    if not cart_items:
        return Response({'message': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

    subtotal = cart.subtotal

    # Shipping cost
    shipping_method = data['shippingMethod']
    if shipping_method == 'STANDARD' and subtotal >= FREE_SHIPPING_THRESHOLD:
        shipping_cost = Decimal('0')
    else:
        shipping_cost = SHIPPING_COSTS.get(shipping_method, SHIPPING_COSTS['STANDARD'])

    # Promo code
    discount_amount = Decimal('0')
    promotion = None
    promo_code_str = (data.get('promoCode') or '').strip().upper()
    if promo_code_str:
        try:
            promotion = Promotion.objects.get(code=promo_code_str, is_active=True)
            valid, error_msg = promotion.is_valid(subtotal)
            if not valid:
                return Response({'message': error_msg}, status=status.HTTP_400_BAD_REQUEST)
            discount_amount = (subtotal * promotion.discount / Decimal('100')).quantize(Decimal('0.01'))
        except Promotion.DoesNotExist:
            return Response({'message': 'Invalid promo code.'}, status=status.HTTP_400_BAD_REQUEST)

    total = subtotal + shipping_cost - discount_amount

    with transaction.atomic():
        # Deduct stock for sized items
        for item in cart_items:
            if not item.size:
                return Response(
                    {'message': f'{item.product.name} n\'est pas disponible à la commande.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                ps = ProductSize.objects.select_for_update().get(
                    product=item.product, size=item.size
                )
                if ps.stock_quantity < item.quantity:
                    return Response(
                        {'message': f'Stock insuffisant pour {item.product.name} ({item.size.name}).'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                ps.stock_quantity -= item.quantity
                ps.save(update_fields=['stock_quantity'])
                invalidate_product_cache(item.product.id, item.product.slug)
            except ProductSize.DoesNotExist:
                return Response(
                    {'message': f'Taille introuvable pour {item.product.name}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Create the order
        order = Order.objects.create(
            user=request.user,
            address=address,
            shipping_method=shipping_method,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            total=total,
            promotion=promotion,
            promo_code_used=promo_code_str,
            notes=data.get('notes', ''),
        )

        # Create order items (snapshot)
        OrderItem.objects.bulk_create([
            OrderItem(
                order=order,
                product=item.product,
                product_name=item.product.name,
                product_image=item.product.primary_image or '',
                size_name=item.size.name if item.size else '',
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            for item in cart_items
        ])

        # Increment promo usage
        if promotion:
            Promotion.objects.filter(pk=promotion.pk).update(
                usage_count=promotion.usage_count + 1
            )

        # Clear the cart
        cart.items.all().delete()

    # Send Telegram notification (non-blocking)
    send_telegram_notification(order)

    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


@extend_schema(operation_id='orders_list')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_list(request):
    # Admins see all orders; regular users see only their own
    if request.user.role == 'ROLE_ADMIN':
        qs = Order.objects.prefetch_related('items', 'address').select_related('user').order_by('-created_at')
    else:
        qs = Order.objects.filter(user=request.user).prefetch_related('items', 'address').order_by('-created_at')
    return Response(OrderSerializer(qs, many=True).data)


@extend_schema(operation_id='orders_retrieve', methods=['GET'])
@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def order_detail(request, pk):
    order = get_object_or_404(
        Order.objects.prefetch_related('items', 'address'),
        pk=pk,
        user=request.user,
    )

    if request.method == 'GET':
        return Response(OrderSerializer(order).data)

    # DELETE — only PENDING orders can be cancelled by users
    if order.status != 'PENDING':
        return Response(
            {'message': 'Only pending orders can be cancelled.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    order.status = 'CANCELLED'
    order.save(update_fields=['status'])
    return Response(OrderSerializer(order).data)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def update_order_status(request, pk):
    order = get_object_or_404(Order, pk=pk)
    new_status = request.data.get('status')
    allowed = [s[0] for s in Order.Status.choices]
    if new_status not in allowed:
        return Response(
            {'message': f'Invalid status. Choose from: {allowed}'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    order.status = new_status
    order.save(update_fields=['status'])
    return Response(OrderSerializer(order).data)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def delete_order(request, pk):
    order = get_object_or_404(Order, pk=pk)
    order.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([AllowAny])
def guest_checkout(request):
    """Guest checkout — no authentication required."""
    serializer = GuestCheckoutSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    items_data = data['items']
    if not items_data:
        return Response({'message': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

    subtotal = sum(
        item['unitPrice'] * item['quantity']
        for item in items_data
    )

    with transaction.atomic():
        # Deduct stock for sized items
        from apps.products.models import ProductSize, Size
        from apps.products.views import invalidate_product_cache
        for item in items_data:
            if not item.get('sizeName'):
                return Response(
                    {'message': f'{item["productName"]} n\'est pas disponible à la commande.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                product = Product.objects.get(pk=item['productId'])
                size = Size.objects.get(name__iexact=item['sizeName'])
                ps = ProductSize.objects.select_for_update().get(product=product, size=size)
                if ps.stock_quantity < item['quantity']:
                    return Response(
                        {'message': f'Stock insuffisant pour {item["productName"]} ({item["sizeName"]}).'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                ps.stock_quantity -= item['quantity']
                ps.save(update_fields=['stock_quantity'])
                invalidate_product_cache(item['productId'], product.slug)
            except (Product.DoesNotExist, Size.DoesNotExist, ProductSize.DoesNotExist) as e:
                return Response(
                    {'message': f'Taille introuvable pour {item["productName"]}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        order = Order.objects.create(
            user=None,
            guest_name=data['guestName'],
            guest_phone=data['guestPhone'],
            guest_address=data['guestAddress'],
            guest_city=data['guestCity'],
            shipping_method='STANDARD',
            subtotal=subtotal,
            shipping_cost=Decimal('0'),
            discount_amount=Decimal('0'),
            total=subtotal,
            notes=data.get('notes', ''),
        )

        OrderItem.objects.bulk_create([
            OrderItem(
                order=order,
                product_id=item['productId'],
                product_name=item['productName'],
                product_image=item.get('productImage', ''),
                size_name=item.get('sizeName', ''),
                quantity=item['quantity'],
                unit_price=item['unitPrice'],
            )
            for item in items_data
        ])

    send_telegram_notification(order)
    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
