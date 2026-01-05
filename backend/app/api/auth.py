import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.services.auth_service import create_anonymous_identity, verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_user_id(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    user_id = verify_token(token)
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    if user.token_hash != token_hash:
        raise HTTPException(status_code=401, detail="Invalid token")
    user.last_active = datetime.utcnow()
    db.commit()
    return user_id


@router.post("/anonymous")
def create_anonymous(db: Session = Depends(get_db)):
    user_id, token, token_hash = create_anonymous_identity()
    user = User(user_id=user_id, token_hash=token_hash)
    db.add(user)
    db.commit()
    return {"user_id": user_id, "token": token}
