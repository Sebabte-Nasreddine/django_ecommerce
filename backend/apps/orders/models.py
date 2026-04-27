"""
Order, OrderItem, and Promotion models.
"""
from django.db import models
from django.conf import settings


class Promotion(models.Model):
    code = models.CharField(max_length=50, unique=True, db_index=True)
    discount = models.DecimalField(max_digits=5, decimal_places=2, help_text='Percentage discount (e.g. 10.00 = 10%)')
    min_purchase = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(default=0, help_text='0 = unlimited')
    usage_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'promotions'
        verbose_name = 'Promotion'
        verbose_name_plural = 'Promotions'

    def __str__(self):
        return f'{self.code} ({self.discount}%)'

    def is_valid(self, subtotal):
        from django.utils import timezone
        if not self.is_active:
            return False, 'This promo code is no longer active.'
        if self.expires_at and self.expires_at < timezone.now():
            return False, 'This promo code has expired.'
        if self.usage_limit > 0 and self.usage_count >= self.usage_limit:
            return False, 'This promo code has reached its usage limit.'
        if subtotal < self.min_purchase:
            return False, f'Minimum order of {self.min_purchase} required for this code.'
        return True, None


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        PROCESSING = 'PROCESSING', 'Processing'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class ShippingMethod(models.TextChoices):
        STANDARD = 'STANDARD', 'Standard'
        EXPRESS = 'EXPRESS', 'Express'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        null=True,
        blank=True,
    )
    # Guest order fields (used when user is None)
    guest_name = models.CharField(max_length=200, blank=True)
    guest_phone = models.CharField(max_length=30, blank=True)
    guest_address = models.CharField(max_length=500, blank=True)
    guest_city = models.CharField(max_length=150, blank=True)
    address = models.ForeignKey(
        'users.Address',
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders',
    )
    shipping_method = models.CharField(
        max_length=20,
        choices=ShippingMethod.choices,
        default=ShippingMethod.STANDARD,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
    )
    promo_code_used = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']

    def __str__(self):
        who = self.user.email if self.user else (self.guest_name or 'Guest')
        return f'Order #{self.id} – {who} – {self.status}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        related_name='order_items',
    )
    # Snapshots in case the product is later deleted or updated
    product_name = models.CharField(max_length=300)
    product_image = models.TextField(blank=True)
    size_name = models.CharField(max_length=50, blank=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'order_items'
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    def __str__(self):
        return f'{self.product_name} × {self.quantity}'

    @property
    def subtotal(self):
        return self.unit_price * self.quantity
