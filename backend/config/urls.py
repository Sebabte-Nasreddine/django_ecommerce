"""
Root URL configuration.

All API endpoints live under /api/.
Media files are served under /uploads/.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Django admin
    path('django-admin/', admin.site.urls),

    # API routes
    # Note: resources without sub-paths (products, categories, etc.) use NO trailing
    # slash on the include so that /api/products matches cleanly (APPEND_SLASH=False).
    # Their sub-urlconfs use a leading '/' separator for sub-paths (e.g. '/<int:pk>').
    path('api/', include([
        path('auth/', include('apps.users.urls')),
        path('products', include('apps.products.urls')),
        path('categories', include('apps.products.category_urls')),
        path('sizes', include('apps.products.size_urls')),
        path('cart', include('apps.cart.urls')),
        path('orders', include('apps.orders.urls')),
        path('users/', include('apps.users.profile_urls')),
        path('admin/', include('apps.admin_panel.urls')),
    ])),

    # API documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve uploaded media files regardless of DEBUG mode
urlpatterns += [
    re_path(r'^uploads/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

# Admin customization
admin.site.site_header = 'SEFA Administration'
admin.site.site_title = 'SEFA Admin'
admin.site.index_title = 'Dashboard'
