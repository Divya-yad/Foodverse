"""Password hashing (bcrypt, cost 12) and JWT helpers."""
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

_DUMMY_HASH = bcrypt.hashpw(b"dummy", bcrypt.gensalt(rounds=12)).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    """Always runs a bcrypt check (against a dummy hash for unknown users) to keep timing uniform."""
    try:
        ok = bcrypt.checkpw(password.encode(), (hashed or _DUMMY_HASH).encode())
    except ValueError:
        return False
    return ok and hashed is not None


def create_token(subject: str, token_type: str, expires: timedelta) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "type": token_type, "iat": now, "exp": now + expires}
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def decode_token(token: str, expected_type: str) -> dict:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("invalid token") from exc
    if payload.get("type") != expected_type or not payload.get("sub"):
        raise ValueError("wrong token type")
    return payload
