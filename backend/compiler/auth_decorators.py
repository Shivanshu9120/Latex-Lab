from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from .db import validate_session

def token_required(f):
    """
    Decorator for Django REST Framework APIView class methods.
    Checks the request headers for a valid 'Authorization: Token <token>' value.
    Attaches request.user to the request object if authentication succeeds.
    """
    @wraps(f)
    def decorator(self, request, *args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        token = None
        
        if auth_header.startswith('Token '):
            parts = auth_header.split(' ')
            if len(parts) == 2:
                token = parts[1]
                
        if not token:
            return Response(
                {"error": "Authentication token is missing. Please provide the header: Authorization: Token <your_token>"},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        try:
            user = validate_session(token)
            if not user:
                return Response(
                    {"error": "Invalid, expired, or logged-out authentication token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            # Attach user details to the request object
            request.user = user
        except Exception as e:
            return Response(
                {"error": f"Database authorization check failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        return f(self, request, *args, **kwargs)
    return decorator
