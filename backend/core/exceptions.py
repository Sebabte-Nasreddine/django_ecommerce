"""
Custom exception handler that returns consistent JSON error responses.

Response format:
    { "message": "...", "errors": {...} }
"""
import logging
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    # Let DRF do its default processing first
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception — log and return 500
        logger.exception('Unhandled exception: %s', exc)
        return Response(
            {'message': 'An internal server error occurred.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Normalise the error payload
    data = response.data

    if isinstance(data, dict):
        # Extract a human-readable message
        if 'detail' in data:
            message = str(data['detail'])
        elif 'message' in data:
            message = str(data['message'])
        elif 'non_field_errors' in data:
            message = ' '.join(str(e) for e in data['non_field_errors'])
        else:
            # Use the first error found
            for key, val in data.items():
                if isinstance(val, list) and val:
                    message = f"{key}: {val[0]}"
                    break
            else:
                message = 'An error occurred.'

        response.data = {'message': message, 'errors': data}
    elif isinstance(data, list):
        response.data = {'message': str(data[0]) if data else 'An error occurred.', 'errors': data}

    return response
