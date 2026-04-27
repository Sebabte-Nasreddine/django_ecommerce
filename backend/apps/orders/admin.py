from django.contrib import admin
from .models import Order, OrderItem, Promotion


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product_name', 'product_image', 'size_name', 'unit_price', 'quantity']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'total', 'shipping_method', 'created_at']
    list_filter = ['status', 'shipping_method']
    search_fields = ['user__email', 'promo_code_used']
    readonly_fields = ['created_at', 'updated_at', 'subtotal', 'shipping_cost', 'discount_amount', 'total']
    inlines = [OrderItemInline]
    raw_id_fields = ['user', 'address', 'promotion']
    list_editable = ['status']
    date_hierarchy = 'created_at'


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount', 'min_purchase', 'usage_count', 'usage_limit', 'is_active', 'expires_at']
    list_filter = ['is_active']
    search_fields = ['code']
    list_editable = ['is_active']
