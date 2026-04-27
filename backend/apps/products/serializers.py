"""
Serializers for the products app.
"""
from rest_framework import serializers
from .models import Category, Size, Product, ProductSize


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image', 'is_active', 'featured', 'featured_order']

    def validate_name(self, value):
        return value.strip()


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ['id', 'name']


class ProductSizeSerializer(serializers.ModelSerializer):
    """Size with stock for a specific product."""
    id = serializers.IntegerField(source='size.id')
    name = serializers.CharField(source='size.name')
    stockQuantity = serializers.IntegerField(source='stock_quantity')

    class Meta:
        model = ProductSize
        fields = ['id', 'name', 'stockQuantity']


class ProductSerializer(serializers.ModelSerializer):
    """Full product representation used for list and detail."""
    categoryId = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )
    categoryName = serializers.CharField(source='category.name', read_only=True, default=None)
    compareAtPrice = serializers.DecimalField(
        source='compare_at_price',
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    sizes = ProductSizeSerializer(source='product_sizes', many=True, read_only=True)
    # sizeIds accepted on write (list of size PKs)
    sizeIds = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description',
            'price', 'compareAtPrice',
            'images', 'featured', 'is_active',
            'categoryId', 'categoryName',
            'sizes', 'sizeIds',
            'created_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at']

    def create(self, validated_data):
        size_ids = validated_data.pop('sizeIds', [])
        product = Product.objects.create(**validated_data)
        self._set_sizes(product, size_ids)
        return product

    def update(self, instance, validated_data):
        size_ids = validated_data.pop('sizeIds', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if size_ids is not None:
            self._set_sizes(instance, size_ids)
        return instance

    def _set_sizes(self, product, size_ids):
        existing = {ps.size_id: ps for ps in product.product_sizes.all()}
        new_ids = set(size_ids)
        # Remove sizes no longer present
        for sid, ps in existing.items():
            if sid not in new_ids:
                ps.delete()
        # Add new sizes
        for sid in new_ids:
            if sid not in existing:
                ProductSize.objects.get_or_create(
                    product=product,
                    size_id=sid,
                    defaults={'stock_quantity': 0},
                )


class ProductStockUpdateSerializer(serializers.Serializer):
    """Used by PUT /products/{id}/sizes/stock."""
    sizeName = serializers.CharField()
    stockQuantity = serializers.IntegerField(min_value=0)

    def validate(self, data):
        product = self.context['product']
        try:
            size = Size.objects.get(name=data['sizeName'])
        except Size.DoesNotExist:
            raise serializers.ValidationError({'sizeName': 'Size not found.'})
        try:
            ps = ProductSize.objects.get(product=product, size=size)
        except ProductSize.DoesNotExist:
            raise serializers.ValidationError({'sizeName': 'This size is not assigned to the product.'})
        data['product_size'] = ps
        return data

    def save(self, **kwargs):
        ps = self.validated_data['product_size']
        ps.stock_quantity = self.validated_data['stockQuantity']
        ps.save()
        return ps
