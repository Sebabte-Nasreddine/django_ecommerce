"""
Shopping cart models.
"""
from django.db import models
from django.conf import settings


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'carts'

    def __str__(self):
        return f'Cart of {self.user.email}'

    @property
    def subtotal(self):
        return sum(item.subtotal for item in self.items.all())

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='cart_items',
    )
    size = models.ForeignKey(
        'products.Size',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cart_items',
    )
    quantity = models.PositiveIntegerField(default=1)
    # Price snapshot at time of adding
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cart_items'
        unique_together = ['cart', 'product', 'size']

    def __str__(self):
        size_str = f' ({self.size.name})' if self.size else ''
        return f'{self.product.name}{size_str} × {self.quantity}'

    @property
    def subtotal(self):
        return self.unit_price * self.quantity
