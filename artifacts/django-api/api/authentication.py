import hmac
import hashlib
import base64
import json
import os
import time
import secrets

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

SECRET = os.environ.get("SESSION_SECRET", "clinica-arguello-secret-2026").encode()


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _base64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def sign_token(user_id: int, role: str) -> str:
    header = _base64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    now = int(time.time())
    payload = _base64url_encode(
        json.dumps({"userId": user_id, "role": role, "iat": now, "exp": now + 86400 * 7}, separators=(",", ":")).encode()
    )
    sig_input = f"{header}.{payload}"
    sig = hmac.new(SECRET, sig_input.encode(), hashlib.sha256).digest()
    return f"{header}.{payload}.{_base64url_encode(sig)}"


def verify_token(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        sig_input = f"{header}.{payload}"
        expected_sig = _base64url_encode(hmac.new(SECRET, sig_input.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload_data = json.loads(_base64url_decode(payload))
        if payload_data.get("exp", 0) < int(time.time()):
            return None
        return payload_data
    except Exception:
        return None


def hash_password(password: str, salt: str = None) -> str:
    s = salt or secrets.token_hex(16)
    h = hmac.new(SECRET, f"{password}:{s}".encode(), hashlib.sha256).hexdigest()
    return f"{s}:{h}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt = stored.split(":", 1)[0]
        expected = hash_password(password, salt)
        return hmac.compare_digest(expected.encode(), stored.encode())
    except Exception:
        return False


class _AnonymousUser:
    is_authenticated = False
    pk = None


class _AuthUser:
    def __init__(self, payload: dict):
        self.pk = payload["userId"]
        self.user_id = payload["userId"]
        self.role = payload["role"]
        self.is_authenticated = True


class HmacJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header[7:]
        payload = verify_token(token)
        if payload is None:
            raise AuthenticationFailed("Invalid or expired token")
        return (_AuthUser(payload), token)

    def authenticate_header(self, request):
        return "Bearer"
