"""
Product, Category, and Size views.
"""
import logging
from django.core.cache import cache
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsAdminOrReadOnly
from .models import Category, Product, ProductSize, Size
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductSizeSerializer,
    ProductStockUpdateSerializer,
    SizeSerializer,
)

logger = logging.getLogger(__name__)

PRODUCT_CACHE_TTL = 60 * 5  # 5 minutes for list/homepage caches


def invalidate_product_cache(product_id=None, slug=None):
    # Clear list and homepage caches (product detail/slug has no cache — always live)
    cache.delete('products_list')
    cache.delete('featured_categories')
    if product_id:
        cache.delete(f'product_{product_id}')


# ── Products ──────────────────────────────────────────────────────────────────

@extend_schema(operation_id='products_list', methods=['GET'])
@extend_schema(operation_id='products_create', methods=['POST'])
@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrReadOnly])
def product_list_create(request):
    if request.method == 'GET':
        category_id = request.query_params.get('categoryId', '')
        featured    = request.query_params.get('featured', '')
        search      = request.query_params.get('search', '')

        is_admin = request.user and request.user.is_authenticated and getattr(request.user, 'role', None) == 'ROLE_ADMIN'

        # Only cache the plain unfiltered public list (not admin)
        use_cache = not is_admin and not category_id and not featured and not search
        cache_key = 'products_list'

        if use_cache:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)

        qs = (
            Product.objects
            .select_related('category')
            .prefetch_related('product_sizes__size')
            .filter(is_active=True)
        )

        if category_id:
            qs = qs.filter(category_id=category_id)
        if featured in ('true', '1'):
            qs = qs.filter(featured=True)
        if search:
            qs = qs.filter(name__icontains=search)

        data = ProductSerializer(qs, many=True).data
        if use_cache:
            cache.set(cache_key, data, PRODUCT_CACHE_TTL)
        return Response(data)

    # POST — admin only (enforced by IsAdminOrReadOnly)
    serializer = ProductSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    product = serializer.save()
    invalidate_product_cache()
    return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


@extend_schema(operation_id='products_retrieve', methods=['GET'])
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminOrReadOnly])
def product_detail(request, pk):
    product = get_object_or_404(
        Product.objects.select_related('category').prefetch_related('product_sizes__size'),
        pk=pk,
    )

    if request.method == 'GET':
        cache_key = f'product_{pk}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        data = ProductSerializer(product).data
        cache.set(cache_key, data, PRODUCT_CACHE_TTL)
        return Response(data)

    if request.method == 'PUT':
        serializer = ProductSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        invalidate_product_cache(pk, product.slug)
        return Response(ProductSerializer(product).data)

    # DELETE
    product.is_active = False
    product.save(update_fields=['is_active'])
    invalidate_product_cache(pk, product.slug)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def product_by_slug(request, slug):
    # No cache — stock must always be real-time on the product detail page
    product = get_object_or_404(
        Product.objects.select_related('category').prefetch_related('product_sizes__size'),
        slug=slug,
        is_active=True,
    )
    return Response(ProductSerializer(product).data)


# ── Related products ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def related_products(request, slug):
    """Return up to 8 active products from the same category, excluding this product."""
    product = get_object_or_404(Product, slug=slug, is_active=True)
    qs = (
        Product.objects
        .filter(is_active=True, category=product.category)
        .exclude(pk=product.pk)
        .select_related('category')
        .prefetch_related('product_sizes__size')
        .order_by('?')[:8]
    )
    # fallback: if category has < 4 results, pad with random products
    results = list(qs)
    if len(results) < 4:
        existing_ids = {p.pk for p in results} | {product.pk}
        extra = (
            Product.objects
            .filter(is_active=True)
            .exclude(pk__in=existing_ids)
            .select_related('category')
            .prefetch_related('product_sizes__size')
            .order_by('?')[:8 - len(results)]
        )
        results += list(extra)
    return Response(ProductSerializer(results, many=True).data)


# ── Product Size Stock ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def product_sizes(request, pk):
    product = get_object_or_404(Product, pk=pk)
    qs = ProductSize.objects.filter(product=product).select_related('size')
    return Response(ProductSizeSerializer(qs, many=True).data)


@extend_schema(operation_id='products_sizes_stock_bulk_update')
@api_view(['PUT'])
@permission_classes([IsAdmin])
def product_size_stock(request, pk):
    """Update stock by size NAME — PUT /products/{pk}/sizes/stock"""
    product = get_object_or_404(Product, pk=pk)
    serializer = ProductStockUpdateSerializer(data=request.data, context={'product': product})
    serializer.is_valid(raise_exception=True)
    ps = serializer.save()
    invalidate_product_cache(pk, product.slug)
    return Response(ProductSizeSerializer(ps).data)


@extend_schema(operation_id='products_size_stock_update')
@api_view(['PUT'])
@permission_classes([IsAdmin])
def product_size_stock_by_id(request, pk, size_id):
    """Update stock by size ID — PUT /products/{pk}/sizes/{size_id}/stock"""
    product = get_object_or_404(Product, pk=pk)
    ps = get_object_or_404(ProductSize, product=product, size_id=size_id)
    stock_quantity = request.data.get('stockQuantity')
    if stock_quantity is None:
        return Response({'message': 'stockQuantity is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        ps.stock_quantity = int(stock_quantity)
    except (ValueError, TypeError):
        return Response({'message': 'stockQuantity must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)
    ps.save(update_fields=['stock_quantity'])
    invalidate_product_cache(pk, product.slug)
    return Response(ProductSizeSerializer(ps).data)


# ── Cart stock validation ─────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def check_cart_stock(request):
    """
    POST /products/check-stock
    Body: [{"productId": 1, "sizeName": "M", "quantity": 2}, ...]
    Returns: {"ok": true} or {"ok": false, "errors": ["..."]}
    """
    items = request.data if isinstance(request.data, list) else []
    errors = []
    for item in items:
        try:
            product = Product.objects.get(pk=item['productId'], is_active=True)
            size = Size.objects.get(name__iexact=item['sizeName'])
            ps = ProductSize.objects.get(product=product, size=size)
            qty = int(item.get('quantity', 1))
            if ps.stock_quantity < qty:
                if ps.stock_quantity == 0:
                    errors.append(f'{product.name} ({size.name}) est épuisé.')
                else:
                    errors.append(
                        f'{product.name} ({size.name}) : seulement {ps.stock_quantity} disponible(s).'
                    )
        except (Product.DoesNotExist, Size.DoesNotExist, ProductSize.DoesNotExist):
            errors.append(f'Produit introuvable (id={item.get("productId")}).')
        except Exception:
            pass
    if errors:
        return Response({'ok': False, 'errors': errors}, status=status.HTTP_200_OK)
    return Response({'ok': True})


# ── Categories ────────────────────────────────────────────────────────────────

@extend_schema(operation_id='categories_list', methods=['GET'])
@extend_schema(operation_id='categories_create', methods=['POST'])
@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrReadOnly])
def category_list_create(request):
    if request.method == 'GET':
        cached = cache.get('categories_list')
        if cached is not None:
            return Response(cached)
        qs = Category.objects.filter(is_active=True)
        data = CategorySerializer(qs, many=True).data
        cache.set('categories_list', data, PRODUCT_CACHE_TTL)
        return Response(data)

    serializer = CategorySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    category = serializer.save()
    cache.delete('categories_list')
    return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)


@extend_schema(operation_id='categories_retrieve', methods=['GET'])
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminOrReadOnly])
def category_detail(request, pk):
    category = get_object_or_404(Category, pk=pk)

    if request.method == 'GET':
        return Response(CategorySerializer(category).data)

    if request.method == 'PUT':
        serializer = CategorySerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        cache.delete('categories_list')
        cache.delete('featured_categories')
        return Response(CategorySerializer(category).data)

    # DELETE — hard delete
    category.delete()
    cache.delete('categories_list')
    cache.delete('featured_categories')
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def featured_categories(request):
    """Return featured categories ordered by featured_order, each with their active products."""
    cached = cache.get('featured_categories')
    if cached is not None:
        return Response(cached)

    cats = Category.objects.filter(is_active=True, featured=True).order_by('featured_order', 'name')
    result = []
    for cat in cats:
        products = (
            Product.objects
            .filter(category=cat, is_active=True)
            .prefetch_related('product_sizes__size')
            .order_by('-id')[:12]
        )
        result.append({
            'id': cat.id,
            'name': cat.name,
            'slug': cat.slug,
            'image': cat.image,
            'products': ProductSerializer(products, many=True).data,
        })
    cache.set('featured_categories', result, PRODUCT_CACHE_TTL)
    return Response(result)


@api_view(['PATCH'])
@permission_classes([IsAdminOrReadOnly])
def toggle_category_featured(request, pk):
    """Toggle featured status for a category and set its order."""
    category = get_object_or_404(Category, pk=pk)
    category.featured = request.data.get('featured', not category.featured)
    category.featured_order = request.data.get('featured_order', category.featured_order)
    category.save(update_fields=['featured', 'featured_order'])
    cache.delete('categories_list')
    cache.delete('featured_categories')
    return Response(CategorySerializer(category).data)


# ── Sizes ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrReadOnly])
def size_list_create(request):
    if request.method == 'GET':
        return Response(SizeSerializer(Size.objects.all(), many=True).data)

    serializer = SizeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    size = serializer.save()
    return Response(SizeSerializer(size).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def size_delete(request, pk):
    size = get_object_or_404(Size, pk=pk)
    size.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
