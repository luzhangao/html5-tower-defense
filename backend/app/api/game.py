from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.api.auth import get_user_id
from backend.app.database.connection import get_db
from backend.app.services.game_service import GameService
from backend.app.services.validator import ReplayValidator

router = APIRouter(prefix="/api/game", tags=["game"])


@router.post("/start")
def start_game(payload: dict, user_id: str = Depends(get_user_id), db: Session = Depends(get_db)):
    rules_version = payload.get("rules_version")
    service = GameService(db, ReplayValidator())
    return service.start_game(user_id, rules_version)


@router.post("/submit")
async def submit_game(payload: dict, user_id: str = Depends(get_user_id), db: Session = Depends(get_db)):
    service = GameService(db, ReplayValidator())
    return await service.submit_score(user_id, payload)
