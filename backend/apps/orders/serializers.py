"""
Order and Promotion serializers.
"""
from rest_framework import serializers
from .models import Order, OrderItem, Promotion
from apps.users.serializers import AddressSerializer


class PromotionSerializer(serializers.ModelSerializer):
    minPurchase = serializers.DecimalField(source='min_purchase', max_digits=10, decimal_places=2)
    expiresAt = serializers.DateTimeField(source='expires_at', allow_null=True, required=False)
    usageLimit = serializers.IntegerField(source='usage_limit')
    usageCount = serializers.IntegerField(source='usage_count', read_only=True)
    isActive = serializers.BooleanField(source='is_active', default=True, required=False)

    class Meta:
        model = Promotion
        fields = ['id', 'code', 'discount', 'minPurchase', 'expiresAt', 'usageLimit', 'usageCount', 'isActive', 'created_at']
        read_only_fields = ['id', 'usageCount', 'created_at']

    def validate_code(self, value):
        return value.upper().strip()


class OrderItemSerializer(serializers.ModelSerializer):
    productName = serializers.CharField(source='product_name')
    productImage = serializers.CharField(source='product_image')
    sizeName = serializers.CharField(source='size_name')
    unitPrice = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'productName', 'productImage', 'sizeName', 'quantity', 'unitPrice', 'subtotal']


class OrderUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shippingMethod = serializers.CharField(source='shipping_method')
    shippingCost = serializers.DecimalField(source='shipping_cost', max_digits=10, decimal_places=2)
    discountAmount = serializers.DecimalField(source='discount_amount', max_digits=10, decimal_places=2)
    promoCode = serializers.CharField(source='promo_code_used', allow_blank=True)
    address = AddressSerializer(read_only=True)
    createdAt = serializers.DateTimeField(source='created_at')
    user = serializers.SerializerMethodField()
    guestName = serializers.CharField(source='guest_name', allow_blank=True)
    guestPhone = serializers.CharField(source='guest_phone', allow_blank=True)
    guestAddress = serializers.CharField(source='guest_address', allow_blank=True)
    guestCity = serializers.CharField(source='guest_city', allow_blank=True)

    def get_user(self, obj):
        if obj.user:
            return OrderUserSerializer(obj.user).data
        return None

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'status', 'shippingMethod', 'shippingCost',
            'subtotal', 'discountAmount', 'total',
            'promoCode', 'notes', 'address', 'items', 'createdAt',
            'guestName', 'guestPhone', 'guestAddress', 'guestCity',
        ]


class CheckoutSerializer(serializers.Serializer):
    addressId = serializers.IntegerField()
    shippingMethod = serializers.ChoiceField(choices=['STANDARD', 'EXPRESS'])
    promoCode = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class GuestCheckoutItemSerializer(serializers.Serializer):
    productId = serializers.IntegerField()
    sizeName = serializers.CharField(required=False, allow_blank=True, default='')
    quantity = serializers.IntegerField(min_value=1)
    unitPrice = serializers.DecimalField(max_digits=10, decimal_places=2)
    productName = serializers.CharField()
    productImage = serializers.CharField(required=False, allow_blank=True, default='')


class GuestCheckoutSerializer(serializers.Serializer):
    guestName = serializers.CharField()
    guestPhone = serializers.CharField()
    guestAddress = serializers.CharField()
    guestCity = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    items = GuestCheckoutItemSerializer(many=True)
