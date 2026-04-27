"""
Serializers for users app.
"""
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Address


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


def user_response(user):
    """Flat auth response expected by the frontend."""
    return {
        'token': get_tokens_for_user(user),
        'id': user.id,
        'email': user.email,
        'firstName': user.first_name,
        'lastName': user.last_name,
        'role': user.role,
        'phone': user.phone,
    }


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    firstName = serializers.CharField(source='first_name', max_length=150)
    lastName = serializers.CharField(source='last_name', max_length=150)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def create(self, validated_data):
        password = validated_data.pop('password')
        phone = validated_data.pop('phone', '')
        user = User(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=phone,
        )
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            request=self.context.get('request'),
            username=data['email'].lower(),
            password=data['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account has been deactivated.')
        data['user'] = user
        return data


class AdminLoginSerializer(LoginSerializer):
    def validate(self, data):
        data = super().validate(data)
        user = data['user']
        if user.role != 'ROLE_ADMIN':
            raise serializers.ValidationError('Admin access required.')
        return data


# ── User Profile ──────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')

    class Meta:
        model = User
        fields = ['id', 'email', 'firstName', 'lastName', 'phone', 'role', 'date_joined']
        read_only_fields = ['id', 'email', 'role', 'date_joined']


class UserListSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')

    class Meta:
        model = User
        fields = ['id', 'email', 'firstName', 'lastName', 'phone', 'role', 'is_active', 'date_joined']


# ── Address ───────────────────────────────────────────────────────────────────

class AddressSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')
    postalCode = serializers.CharField(source='postal_code')
    isDefault = serializers.BooleanField(source='is_default', required=False)

    class Meta:
        model = Address
        fields = ['id', 'fullName', 'street', 'city', 'postalCode', 'country', 'phone', 'isDefault']
