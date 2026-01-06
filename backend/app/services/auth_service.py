import hashlib
import os
import uuid
from datetime import datetime, timedelta, timezone
import jwt

JWT_SECRET = os.getenv("TD_JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"
JWT_EXPIRES_DAYS = 30


def create_anonymous_identity() -> tuple[str, str, str]:
    # 生成匿名用户、JWT 以及 token hash
    user_id = str(uuid.uuid4())
    token = jwt.encode(
        {
            "sub": user_id,
            "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRES_DAYS),
        },
        JWT_SECRET,
        algorithm=JWT_ALG,
    )
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return user_id, token, token_hash


def verify_token(token: str) -> str:
    # 解码 JWT，返回 user_id
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    return payload.get("sub")
