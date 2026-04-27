from django.contrib import admin
from .models import Category, Product, ProductSize, Size


class ProductSizeInline(admin.TabularInline):
    model = ProductSize
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'category', 'featured', 'is_active', 'created_at']
    list_filter = ['is_active', 'featured', 'category']
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductSizeInline]
    list_editable = ['featured', 'is_active']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {'fields': ('name', 'slug', 'description')}),
        ('Pricing', {'fields': ('price', 'compare_at_price')}),
        ('Media', {'fields': ('images',)}),
        ('Classification', {'fields': ('category', 'featured', 'is_active')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


@admin.register(ProductSize)
class ProductSizeAdmin(admin.ModelAdmin):
    list_display = ['product', 'size', 'stock_quantity']
    list_filter = ['size']
    raw_id_fields = ['product']
