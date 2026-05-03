from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..models import User
from ..authentication import hash_password
from ..permissions import IsAdmin


class UserListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.all().values("id", "name", "email", "role", "is_active", "created_at")
        return Response(list(users))

    def post(self, request):
        name = request.data.get("name")
        email = request.data.get("email")
        password = request.data.get("password")
        role = request.data.get("role")
        if not all([name, email, password, role]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
        )
        return Response({"id": user.id, "name": user.name, "email": user.email, "role": user.role, "isActive": user.is_active, "createdAt": user.created_at}, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"id": user.id, "name": user.name, "email": user.email, "role": user.role, "isActive": user.is_active, "createdAt": user.created_at})

    def put(self, request, pk):
        if request.user.role != "admin":
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        user = self._get_user(pk)
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        for field in ["name", "email", "role"]:
            if field in request.data:
                setattr(user, field, request.data[field])
        if "isActive" in request.data:
            user.is_active = request.data["isActive"]
        if "password" in request.data and request.data["password"]:
            user.password_hash = hash_password(request.data["password"])
        user.save()
        return Response({"id": user.id, "name": user.name, "email": user.email, "role": user.role, "isActive": user.is_active, "createdAt": user.created_at})

    def delete(self, request, pk):
        if request.user.role != "admin":
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        user = self._get_user(pk)
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
