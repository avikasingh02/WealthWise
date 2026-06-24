import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.security import (
    hash_password, verify_password,
    create_access_token, decode_access_token,
    create_refresh_token, hash_refresh_token,
)
from app.config import settings
from app.models.user import User, RefreshToken, AuditLog
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserOut


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------ #
    # Register
    # ------------------------------------------------------------------ #
    def register(self, req: RegisterRequest) -> UserOut:
        existing = self.db.query(User).filter(User.email == req.email.lower()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = User(
            name=req.name,
            email=req.email.lower(),
            password_hash=hash_password(req.password),
            role="user",
        )
        self.db.add(user)
        self.db.flush()
        self._audit(user.id, "register")
        self.db.commit()
        self.db.refresh(user)
        return UserOut.model_validate(user)

    # ------------------------------------------------------------------ #
    # Login
    # ------------------------------------------------------------------ #
    def login(self, req: LoginRequest) -> TokenResponse:
        user = self.db.query(User).filter(User.email == req.email.lower()).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

        access_token, _ = create_access_token(user.id, user.role)
        raw_refresh, refresh_hash, refresh_jti = create_refresh_token()

        rt = RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            jti=refresh_jti,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_REFRESH_TTL),
        )
        self.db.add(rt)
        self._audit(user.id, "login")
        self.db.commit()

        return TokenResponse(access_token=access_token, refresh_token=raw_refresh)

    # ------------------------------------------------------------------ #
    # Refresh
    # ------------------------------------------------------------------ #
    def refresh(self, raw_refresh: str) -> TokenResponse:
        token_hash = hash_refresh_token(raw_refresh)
        rt = self.db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()

        if not rt or rt.revoked or rt.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

        user = self.db.query(User).filter(User.id == rt.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled")

        # Revoke old token
        rt.revoked = True

        # Issue new pair
        access_token, _ = create_access_token(user.id, user.role)
        raw_new, new_hash, new_jti = create_refresh_token()

        new_rt = RefreshToken(
            user_id=user.id,
            token_hash=new_hash,
            jti=new_jti,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_REFRESH_TTL),
        )
        self.db.add(new_rt)
        self.db.commit()

        return TokenResponse(access_token=access_token, refresh_token=raw_new)

    # ------------------------------------------------------------------ #
    # Logout
    # ------------------------------------------------------------------ #
    def logout(self, raw_refresh: str, user_id: uuid.UUID) -> None:
        token_hash = hash_refresh_token(raw_refresh)
        rt = self.db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
        ).first()
        if rt:
            rt.revoked = True
        self._audit(user_id, "logout")
        self.db.commit()

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    def _audit(self, user_id: uuid.UUID, action: str, meta: dict | None = None) -> None:
        self.db.add(AuditLog(user_id=user_id, action=action, meta=meta))
