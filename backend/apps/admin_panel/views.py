"""
Admin panel views: stats, user management, order management, promotions, image uploads.
"""
import io
import os
import uuid
import mimetypes
import logging
from pathlib import Path

from PIL import Image

from django.conf import settings
from django.core.cache import cache
from django.db.models import Sum, Count
from django.http import FileResponse, Http404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse
from rest_framework import serializers as drf_serializers, status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from apps.admin_panel.models import Advertisement, BannerImage, ShippingSettings
from apps.orders.models import Order, Promotion
from apps.orders.serializers import OrderSerializer, PromotionSerializer
from apps.products.models import Category
from apps.products.serializers import CategorySerializer
from apps.users.models import User
from apps.users.serializers import UserListSerializer
from core.permissions import IsAdmin
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB — compressed to WebP before saving
MAX_DIMENSION = 1000                # px — ample for web, keeps files small
WEBP_QUALITY = 80                  # good quality, smaller output


# ── Stats ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def stats(request):
    cache_key = 'admin_stats'
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    total_orders = Order.objects.count()
    total_revenue = Order.objects.exclude(status='CANCELLED').aggregate(
        revenue=Sum('total')
    )['revenue'] or 0
    total_users = User.objects.filter(role='ROLE_USER').count()
    from apps.products.models import Product
    total_products = Product.objects.filter(is_active=True).count()

    # Orders by status
    orders_by_status = list(
        Order.objects.values('status').annotate(count=Count('id'))
    )

    # Revenue this month
    from django.utils import timezone
    now = timezone.now()
    monthly_revenue = Order.objects.filter(
        created_at__year=now.year,
        created_at__month=now.month,
    ).exclude(status='CANCELLED').aggregate(rev=Sum('total'))['rev'] or 0

    data = {
        'totalOrders': total_orders,
        'totalRevenue': float(total_revenue),
        'totalUsers': total_users,
        'totalProducts': total_products,
        'ordersByStatus': orders_by_status,
        'monthlyRevenue': float(monthly_revenue),
    }
    cache.set(cache_key, data, 60)  # cache 1 minute
    return Response(data)


# ── Categories (admin) ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_categories(request):
    qs = Category.objects.all()
    return Response(CategorySerializer(qs, many=True).data)


# ── Users ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_users(request):
    qs = User.objects.all().order_by('-date_joined')
    return Response(UserListSerializer(qs, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def admin_delete_user(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'message': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    if user.role == 'ROLE_ADMIN':
        return Response({'message': 'Cannot delete an admin user.'}, status=status.HTTP_400_BAD_REQUEST)
    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Orders (admin) ────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_orders(request):
    qs = (
        Order.objects
        .prefetch_related('items', 'address')
        .select_related('user')
        .order_by('-created_at')
    )
    # Optional status filter
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    return Response(OrderSerializer(qs, many=True).data)


# ── Promotions ────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def promotions(request):
    if request.method == 'GET':
        qs = Promotion.objects.all().order_by('-created_at')
        return Response(PromotionSerializer(qs, many=True).data)

    serializer = PromotionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    promo = serializer.save()
    return Response(PromotionSerializer(promo).data, status=status.HTTP_201_CREATED)


@extend_schema(
    methods=['PUT'],
    operation_id='admin_promotion_update',
    request=PromotionSerializer,
    responses={200: PromotionSerializer},
)
@extend_schema(
    methods=['DELETE'],
    operation_id='admin_promotion_destroy',
    responses={204: None},
)
@api_view(['PUT', 'DELETE'])
@permission_classes([IsAdmin])
def promotion_detail(request, pk):
    try:
        promo = Promotion.objects.get(pk=pk)
    except Promotion.DoesNotExist:
        return Response({'message': 'Promotion not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        serializer = PromotionSerializer(promo, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PromotionSerializer(promo).data)

    promo.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Image Upload / Download ───────────────────────────────────────────────────

# ── Advertisements ────────────────────────────────────────────────────────────

class AdvertisementSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Advertisement
        fields = ['id', 'text', 'icon', 'is_active', 'order', 'created_at']


@api_view(['GET'])
@permission_classes([AllowAny])
def public_advertisements(request):
    """Public: returns only active advertisements ordered by display order."""
    qs = Advertisement.objects.filter(is_active=True).order_by('order', 'created_at')
    return Response(AdvertisementSerializer(qs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def admin_advertisements(request):
    if request.method == 'GET':
        qs = Advertisement.objects.all().order_by('order', 'created_at')
        return Response(AdvertisementSerializer(qs, many=True).data)

    serializer = AdvertisementSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    ad = serializer.save()
    return Response(AdvertisementSerializer(ad).data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAdmin])
def admin_advertisement_detail(request, pk):
    try:
        ad = Advertisement.objects.get(pk=pk)
    except Advertisement.DoesNotExist:
        return Response({'message': 'Publicité introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        serializer = AdvertisementSerializer(ad, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdvertisementSerializer(ad).data)

    ad.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Image Upload / Download ───────────────────────────────────────────────────

@extend_schema(
    operation_id='admin_upload_image',
    request=inline_serializer('ImageUpload', fields={'file': drf_serializers.ImageField()}),
    responses={201: inline_serializer('ImageUploadResponse', fields={
        'url': drf_serializers.CharField(),
        'filename': drf_serializers.CharField(),
    })},
)
@api_view(['POST'])
@permission_classes([IsAdmin])
@parser_classes([MultiPartParser, FormParser])
def upload_image(request):
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({'message': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate size
    if file_obj.size > MAX_IMAGE_SIZE:
        return Response({'message': 'File too large (max 20 MB).'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate MIME type
    content_type = file_obj.content_type or ''
    if content_type not in ALLOWED_IMAGE_TYPES:
        return Response({'message': 'Only JPEG, PNG, WebP, and GIF images are allowed.'}, status=status.HTTP_400_BAD_REQUEST)

    ext = Path(file_obj.name).suffix.lower()
    if ext not in {'.jpg', '.jpeg', '.png', '.webp', '.gif'}:
        return Response({'message': 'Invalid file extension.'}, status=status.HTTP_400_BAD_REQUEST)

    # Read the raw bytes once
    raw = file_obj.read()

    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception:
        return Response({'message': 'Cannot read image file.'}, status=status.HTTP_400_BAD_REQUEST)

    # Apply EXIF rotation so phone photos aren't saved sideways
    from PIL import ImageOps
    img = ImageOps.exif_transpose(img)

    # Convert palette/transparency modes for WebP compatibility
    if img.mode in ('P', 'RGBA', 'LA'):
        img = img.convert('RGBA')
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Downscale if either dimension exceeds MAX_DIMENSION
    w, h = img.size
    if w > MAX_DIMENSION or h > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    filename = f'{uuid.uuid4().hex}.webp'
    upload_dir = Path(settings.MEDIA_ROOT)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / filename

    img.save(dest, format='WEBP', quality=WEBP_QUALITY, method=0)
    logger.info('Image saved: %s (original %.1f KB → %.1f KB webp)', filename, len(raw) / 1024, dest.stat().st_size / 1024)

    url = f'/uploads/{filename}'
    return Response({'url': url, 'filename': filename}, status=status.HTTP_201_CREATED)


@extend_schema(
    operation_id='admin_download_image',
    responses={(200, 'application/octet-stream'): OpenApiTypes.BINARY},
)
@api_view(['GET'])
@permission_classes([IsAdmin])
def download_image(request, filename):
    # Prevent path traversal
    if '..' in filename or '/' in filename:
        return Response({'message': 'Invalid filename.'}, status=status.HTTP_400_BAD_REQUEST)

    file_path = Path(settings.MEDIA_ROOT) / filename
    if not file_path.exists() or not file_path.is_file():
        raise Http404('Image not found.')

    content_type, _ = mimetypes.guess_type(str(file_path))
    response = FileResponse(
        open(file_path, 'rb'),
        content_type=content_type or 'application/octet-stream',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ── Shipping Settings ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def public_shipping_settings(request):
    """GET /api/shipping-settings — returns current shipping config (public)."""
    s = ShippingSettings.get()
    return Response({
        'shippingPrice': float(s.shipping_price),
        'freeShippingThreshold': float(s.free_shipping_threshold) if s.free_shipping_threshold is not None else None,
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAdmin])
def admin_shipping_settings(request):
    """GET/PUT /api/admin/shipping-settings — read or update shipping config."""
    s = ShippingSettings.get()
    if request.method == 'GET':
        return Response({
            'shippingPrice': float(s.shipping_price),
            'freeShippingThreshold': float(s.free_shipping_threshold) if s.free_shipping_threshold is not None else None,
        })
    # PUT
    price = request.data.get('shippingPrice', 0)
    threshold = request.data.get('freeShippingThreshold', None)
    try:
        s.shipping_price = float(price)
        s.free_shipping_threshold = float(threshold) if threshold not in (None, '', 0, '0') else None
        s.save()
    except (ValueError, TypeError):
        return Response({'message': 'Valeurs invalides.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'shippingPrice': float(s.shipping_price),
        'freeShippingThreshold': float(s.free_shipping_threshold) if s.free_shipping_threshold is not None else None,
    })


# ── Banner Image ──────────────────────────────────────────────────────────────

def _banner_response(b):
    return Response({'desktopImage': b.desktop_image, 'mobileImage': b.mobile_image})


@api_view(['GET'])
@permission_classes([AllowAny])
def public_banner(request):
    """GET /api/banner — public banner images."""
    return _banner_response(BannerImage.get())


@api_view(['GET', 'PUT'])
@permission_classes([IsAdmin])
def admin_banner(request):
    """GET/PUT /api/admin/banner — read or update banner images."""
    b = BannerImage.get()
    if request.method == 'GET':
        return _banner_response(b)
    b.desktop_image = request.data.get('desktopImage', b.desktop_image)
    b.mobile_image  = request.data.get('mobileImage', b.mobile_image)
    b.save()
    return _banner_response(b)
