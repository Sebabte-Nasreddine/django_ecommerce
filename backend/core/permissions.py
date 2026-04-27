"""
Custom permission classes for the SEFA API.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Allow access only to users with ROLE_ADMIN."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ROLE_ADMIN'
        )


class IsOwnerOrAdmin(BasePermission):
    """Allow access to the resource owner or an admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ROLE_ADMIN':
            return True
        owner = getattr(obj, 'user', None)
        return owner == request.user


class IsAdminOrReadOnly(BasePermission):
    """Read-only for everyone; write access for admins only."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ROLE_ADMIN'
        )
