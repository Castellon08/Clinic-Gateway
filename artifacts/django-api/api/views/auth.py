from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from ..models import User
from ..authentication import sign_token, verify_password
from ..serializers import UserSerializer


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")
        if not email or not password:
            return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Unauthorized", "message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"error": "Unauthorized", "message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        if not verify_password(password, user.password_hash):
            return Response({"error": "Unauthorized", "message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        token = sign_token(user.id, user.role)
        return Response({
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "isActive": user.is_active,
                "createdAt": user.created_at,
            }
        })


class MeView(APIView):
    def get(self, request):
        try:
            user = User.objects.get(pk=request.user.pk)
        except User.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "isActive": user.is_active,
            "createdAt": user.created_at,
        })


class LogoutView(APIView):
    def post(self, request):
        return Response({"message": "Logged out successfully"})
