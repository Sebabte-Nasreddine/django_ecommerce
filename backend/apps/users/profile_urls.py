"""
User profile URL patterns: mounted at /api/users/
"""
from django.urls import path
from .views import AddressListCreateView

urlpatterns = [
    path('me/addresses', AddressListCreateView.as_view(), name='user-addresses'),
]
