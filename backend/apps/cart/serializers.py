"""
Cart serializers that match the frontend's CartItem and Cart interfaces exactly.
"""
from rest_framework import serializers
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    productId = serializers.IntegerField(source='product.id')
    productName = serializers.CharField(source='product.name')
    productImage = serializers.SerializerMethodField()
    unitPrice = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    stockQuantity = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'productId', 'productName', 'productImage', 'unitPrice', 'quantity', 'subtotal', 'stockQuantity']

    def get_productImage(self, obj):
        images = obj.product.images
        if images:
            return images[0]
        return None

    def get_stockQuantity(self, obj):
        if obj.size:
            from apps.products.models import ProductSize
            try:
                ps = ProductSize.objects.get(product=obj.product, size=obj.size)
                return ps.stock_quantity
            except ProductSize.DoesNotExist:
                return 0
        return 999  # No size = not tracked


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    totalItems = serializers.IntegerField(source='total_items')

    class Meta:
        model = Cart
        fields = ['id', 'items', 'subtotal', 'totalItems']


class AddToCartSerializer(serializers.Serializer):
    productId = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    sizeName = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
