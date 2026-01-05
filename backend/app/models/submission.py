from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from backend.app.database.connection import Base


class Submission(Base):
    __tablename__ = "submissions"

    submission_id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(String, ForeignKey("attempts.attempt_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    score_claim = Column(Integer, nullable=False)
    score_actual = Column(Integer)
    level_claim = Column(Integer, nullable=False)
    level_actual = Column(Integer)
    actions = Column(String, nullable=False)
    validation_result = Column(String)
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    validated_at = Column(DateTime)
