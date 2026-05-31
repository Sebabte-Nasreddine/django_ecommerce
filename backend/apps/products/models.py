"""
Product catalog models: Category, Size, Product, ProductSize, Review.
"""
from django.db import models
from django.utils.text import slugify
from django.conf import settings


class Category(models.Model):
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True)
    image = models.CharField(max_length=500, blank=True, default='')
    is_active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)
    featured_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Size(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'sizes'
        verbose_name = 'Size'
        verbose_name_plural = 'Sizes'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # List of image URLs / paths stored as JSON
    images = models.JSONField(default=list, blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
    )
    sizes = models.ManyToManyField(Size, through='ProductSize', blank=True)
    featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def primary_image(self):
        if self.images:
            return self.images[0]
        return None


class ProductSize(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_sizes')
    size = models.ForeignKey(Size, on_delete=models.CASCADE, related_name='product_sizes')
    stock_quantity = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'product_sizes'
        unique_together = ['product', 'size']
        verbose_name = 'Product Size'
        verbose_name_plural = 'Product Sizes'

    def __str__(self):
        return f'{self.product.name} – {self.size.name} ({self.stock_quantity})'


class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reviews'
        unique_together = ['product', 'user']
        ordering = ['-created_at']
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'

    def __str__(self):
        return f'{self.user.first_name}: {self.rating}/5 - {self.product.name}'
