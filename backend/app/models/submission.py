from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from backend.app.database.connection import Base


class Submission(Base):
    # 提交记录：保存声明分数与验证结果
    __tablename__ = "submissions"

    submission_id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(String, ForeignKey("attempts.attempt_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    score_claim = Column(Integer, nullable=False)  # 客户端声明分数
    score_actual = Column(Integer)  # 服务端验证分数
    level_claim = Column(Integer, nullable=False)
    level_actual = Column(Integer)
    actions = Column(String, nullable=False)  # 回放 actions（JSON 字符串）
    validation_result = Column(String)
    submitted_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    validated_at = Column(DateTime)
