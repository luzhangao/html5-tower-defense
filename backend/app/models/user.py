from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from backend.app.database.connection import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True)
    token_hash = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    last_active = Column(DateTime)
