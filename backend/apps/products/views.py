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
from .models import Category, Product, ProductSize, Review, Size
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductSizeSerializer,
    ProductStockUpdateSerializer,
    ReviewSerializer,
    SizeSerializer,
)

logger = logging.getLogger(__name__)

PRODUCT_LIST_CACHE_TTL = 600   # 10 minutes
PRODUCT_CACHE_TTL = 1800       # 30 minutes
RELATED_CACHE_TTL = 3600       # 1 hour


def invalidate_product_cache(product_id=None, slug=None):
    keys = ['featured_categories_meta', 'featured_categories_full', 'categories_list']
    if slug:
        keys.append(f'related_{slug}')
    cache.delete_many(keys)
    # Wildcard-delete all products_list_* keys
    try:
        from django_redis import get_redis_connection
        conn = get_redis_connection('default')
        for k in conn.scan_iter(b'*products_list*'):
            conn.delete(k)
    except Exception:
        pass


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

        # Cache product lists for 60 s — checkout always does a live stock check anyway
        if not search:
            cache_key = f'products_list_{category_id or "all"}_{featured or "0"}'
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)
        else:
            cache_key = None

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
        if cache_key:
            cache.set(cache_key, data, PRODUCT_LIST_CACHE_TTL)
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
        return Response(ProductSerializer(product).data)

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
    cache_key = f'related_{slug}'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    product = get_object_or_404(Product, slug=slug, is_active=True)
    qs = (
        Product.objects
        .filter(is_active=True, category=product.category)
        .exclude(pk=product.pk)
        .select_related('category')
        .prefetch_related('product_sizes__size')
        .order_by('-id')[:8]
    )
    results = list(qs)
    if len(results) < 4:
        existing_ids = {p.pk for p in results} | {product.pk}
        extra = (
            Product.objects
            .filter(is_active=True)
            .exclude(pk__in=existing_ids)
            .select_related('category')
            .prefetch_related('product_sizes__size')
            .order_by('-id')[:8 - len(results)]
        )
        results += list(extra)
    data = ProductSerializer(results, many=True).data
    cache.set(cache_key, data, RELATED_CACHE_TTL)
    return Response(data)


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
        cache.delete('featured_categories_meta')
        return Response(CategorySerializer(category).data)

    # DELETE — hard delete
    category.delete()
    cache.delete('categories_list')
    cache.delete('featured_categories_meta')
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def featured_categories(request):
    """Return featured categories with their active products — fully cached."""
    cached = cache.get('featured_categories_full')
    if cached is not None:
        return Response(cached)

    cats = list(Category.objects.filter(is_active=True, featured=True).order_by('featured_order', 'name'))
    cat_ids = [c.id for c in cats]

    # Single query for all products across all featured categories
    from collections import defaultdict
    products_qs = (
        Product.objects
        .filter(is_active=True, category_id__in=cat_ids)
        .select_related('category')
        .prefetch_related('product_sizes__size')
        .order_by('-id')
    )
    products_by_cat: dict = defaultdict(list)
    for p in products_qs:
        if len(products_by_cat[p.category_id]) < 12:
            products_by_cat[p.category_id].append(p)

    result = []
    for cat in cats:
        result.append({
            'id': cat.id,
            'name': cat.name,
            'slug': cat.slug,
            'image': cat.image,
            'products': ProductSerializer(products_by_cat[cat.id], many=True).data,
        })

    cache.set('featured_categories_full', result, PRODUCT_CACHE_TTL)
    # Keep metadata cache in sync
    cache.set('featured_categories_meta', [
        {'id': c.id, 'name': c.name, 'slug': c.slug, 'image': c.image} for c in cats
    ], PRODUCT_CACHE_TTL)
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
    cache.delete('featured_categories_meta')
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


# ── Reviews ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def product_reviews(request, pk):
    """GET: list active reviews for a product. POST: create a review (auth required)."""
    product = get_object_or_404(Product, pk=pk)

    if request.method == 'GET':
        qs = Review.objects.filter(product=product, is_active=True).select_related('user')
        return Response(ReviewSerializer(qs, many=True).data)

    # POST — must be authenticated
    if not request.user.is_authenticated:
        return Response({'message': 'Authentification requise.'}, status=status.HTTP_401_UNAUTHORIZED)

    # Check if user already reviewed this product
    existing = Review.objects.filter(product=product, user=request.user).first()
    if existing:
        return Response({'message': 'Vous avez déjà noté ce produit.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = ReviewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(product=product, user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def review_detail(request, pk, review_id):
    """Update or delete own review."""
    review = get_object_or_404(Review, pk=review_id, product_id=pk)

    if review.user != request.user and not request.user.role == 'ROLE_ADMIN':
        return Response({'message': 'Vous ne pouvez modifier que vos propres avis.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        serializer = ReviewSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # DELETE
    review.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_reviews(request):
    """List all reviews (admin) with optional product filter."""
    qs = Review.objects.select_related('user', 'product').all()
    product_id = request.query_params.get('productId')
    if product_id:
        qs = qs.filter(product_id=product_id)
    return Response(ReviewSerializer(qs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_review_toggle_active(request, review_id):
    """Toggle is_active for a review (admin moderation)."""
    review = get_object_or_404(Review, pk=review_id)
    review.is_active = request.data.get('is_active', not review.is_active)
    review.save(update_fields=['is_active'])
    return Response(ReviewSerializer(review).data)
