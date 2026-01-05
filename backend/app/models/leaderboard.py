from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from backend.app.database.connection import Base


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"

    entry_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, unique=True)
    score = Column(Integer, nullable=False)
    level = Column(Integer, nullable=False)
    money = Column(Integer)
    end_tick = Column(Integer)
    actions = Column(String, nullable=False)
    rules_version = Column(String, nullable=False)
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
