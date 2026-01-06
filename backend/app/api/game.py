import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.api.auth import get_user_id
from backend.app.database.connection import get_db
from backend.app.services.game_service import GameService
from backend.app.services.validator import ReplayValidator

router = APIRouter(prefix="/api/game", tags=["game"])
logger = logging.getLogger("td_api")


@router.post("/start")
def start_game(payload: dict, user_id: str = Depends(get_user_id), db: Session = Depends(get_db)):
    rules_version = payload.get("rules_version")
    service = GameService(db, ReplayValidator())
    logger.info("start_game user_id=%s rules_version=%s", user_id, rules_version)
    return service.start_game(user_id, rules_version)


@router.post("/submit")
async def submit_game(payload: dict, user_id: str = Depends(get_user_id), db: Session = Depends(get_db)):
    service = GameService(db, ReplayValidator())
    logger.info("submit_game user_id=%s attempt_id=%s", user_id, payload.get("attempt_id"))
    return await service.submit_score(user_id, payload)
