from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from backend.app.database.connection import Base


class Attempt(Base):
    # 排行榜尝试记录：用于防重放与过期控制
    __tablename__ = "attempts"

    attempt_id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    seed = Column(Integer, nullable=False)  # 本局随机种子
    rules_version = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)  # 是否已提交
    used_at = Column(DateTime)
