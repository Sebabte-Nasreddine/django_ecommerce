"""
Views for authentication and user profile/address management.
"""
from django.core.cache import cache
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Address
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    AdminLoginSerializer,
    UserProfileSerializer,
    AddressSerializer,
    user_response,
)


# ── Auth endpoints ────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(user_response(user), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    return Response(user_response(serializer.validated_data['user']))


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    serializer = AdminLoginSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    return Response(user_response(serializer.validated_data['user']))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    cache_key = f'user_me_{request.user.id}'
    data = cache.get(cache_key)
    if data is None:
        serializer = UserProfileSerializer(request.user)
        data = serializer.data
        cache.set(cache_key, data, timeout=60)
    return Response(data)


# ── Address endpoints ─────────────────────────────────────────────────────────

class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
