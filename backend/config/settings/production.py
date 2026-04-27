"""
Production settings — extends base.
"""
from .base import *  # noqa

DEBUG = False

# In production, set ALLOWED_HOSTS via environment variable
# Example: ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Enforce HTTPS in production (uncomment when behind HTTPS terminator)
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True
# SECURE_HSTS_SECONDS = 31536000
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_PRELOAD = True
