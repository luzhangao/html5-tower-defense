from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.models.leaderboard import LeaderboardEntry
from backend.app.api.auth import get_user_id

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("")
# 获取排行榜前 N 名
def get_leaderboard(limit: int = 100, db: Session = Depends(get_db)):
    entries = (
        db.query(LeaderboardEntry)
        .order_by(LeaderboardEntry.score.desc(), LeaderboardEntry.submitted_at.asc())
        .limit(limit)
        .all()
    )
    result = []
    for idx, entry in enumerate(entries, start=1):
        result.append(
            {
                "rank": idx,
                "user_id": entry.user_id,
                "score": entry.score,
                "level": entry.level,
                "submitted_at": entry.submitted_at.isoformat() + "Z",
            }
        )
    return {"entries": result, "total": len(result)}


@router.get("/me")
# 获取当前用户的排名
def get_my_rank(user_id: str = Depends(get_user_id), db: Session = Depends(get_db)):
    entries = (
        db.query(LeaderboardEntry)
        .order_by(LeaderboardEntry.score.desc(), LeaderboardEntry.submitted_at.asc())
        .all()
    )
    for idx, entry in enumerate(entries, start=1):
        if entry.user_id == user_id:
            return {
                "rank": idx,
                "score": entry.score,
                "level": entry.level,
                "submitted_at": entry.submitted_at.isoformat() + "Z",
            }
    return {"rank": None}
