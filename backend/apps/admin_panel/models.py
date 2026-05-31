from django.db import models


class ShippingSettings(models.Model):
    """Singleton — always pk=1. Use ShippingSettings.get() to read/create."""
    shipping_price          = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    free_shipping_threshold = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'shipping_settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class BannerImage(models.Model):
    """Singleton — always pk=1. Use BannerImage.get() to read/create."""
    desktop_image = models.CharField(max_length=500, blank=True, default='')
    mobile_image  = models.CharField(max_length=500, blank=True, default='')
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'banner_image'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Advertisement(models.Model):
    ICON_CHOICES = [
        ('truck',       'Livraison'),
        ('credit_card', 'Paiement'),
        ('tag',         'Promotion'),
        ('gift',        'Cadeau'),
        ('phone',       'Téléphone'),
        ('star',        'Étoile'),
        ('none',        'Aucune icône'),
    ]

    text      = models.CharField(max_length=300)
    icon      = models.CharField(max_length=20, choices=ICON_CHOICES, default='none')
    is_active = models.BooleanField(default=True)
    order     = models.PositiveIntegerField(default=0, help_text='Ordre d\'affichage (0 = en premier)')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'advertisements'
        ordering = ['order', 'created_at']
        verbose_name = 'Publicité'
        verbose_name_plural = 'Publicités'

    def __str__(self):
        return self.text[:60]
