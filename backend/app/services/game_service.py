import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.models.attempt import Attempt
from backend.app.models.submission import Submission
from backend.app.models.leaderboard import LeaderboardEntry
from backend.app.services.anticheat import AntiCheatService
from backend.app.services.validator import ReplayValidator


class GameService:
    def __init__(self, db: Session, validator: ReplayValidator):
        self.db = db
        self.validator = validator

    def start_game(self, user_id: str, rules_version: str) -> dict:
        attempt_id = uuid.uuid4().hex
        seed = uuid.uuid4().int % 2_147_483_647
        now = datetime.utcnow()
        attempt = Attempt(
            attempt_id=attempt_id,
            user_id=user_id,
            seed=seed,
            rules_version=rules_version,
            created_at=now,
            expires_at=now + timedelta(minutes=60),
            used=False,
        )
        self.db.add(attempt)
        self.db.commit()
        return {
            "attempt_id": attempt_id,
            "seed": seed,
            "rules_version": rules_version,
            "expires_at": attempt.expires_at.isoformat() + "Z",
        }

    async def submit_score(self, user_id: str, payload: dict) -> dict:
        AntiCheatService.check_rate_limit(user_id, self.db)

        attempt = self.db.query(Attempt).filter(Attempt.attempt_id == payload["attempt_id"]).first()
        if not attempt or attempt.user_id != user_id:
            return {"success": False, "reason": "Invalid attempt"}
        if attempt.used:
            return {"success": False, "reason": "Attempt already used"}
        if attempt.expires_at < datetime.utcnow():
            return {"success": False, "reason": "Attempt expired"}
        if attempt.rules_version != payload["rules_version"]:
            return {"success": False, "reason": "Rules version mismatch"}

        actions = payload.get("actions") or []
        if AntiCheatService.is_suspicious_pattern(actions):
            return {"success": False, "reason": "Suspicious actions"}

        submission = Submission(
            attempt_id=attempt.attempt_id,
            user_id=user_id,
            score_claim=payload["score_claim"],
            level_claim=payload["level_claim"],
            actions=json.dumps(actions),
            submitted_at=datetime.utcnow(),
        )
        self.db.add(submission)
        attempt.used = True
        attempt.used_at = datetime.utcnow()
        self.db.commit()

        threshold = AntiCheatService.get_entry_threshold(self.db)
        if payload["score_claim"] < threshold:
            return {
                "success": True,
                "score": payload["score_claim"],
                "entered_leaderboard": False,
                "threshold": threshold,
                "reason": "Score below threshold",
            }

        result = await self.validator.validate(
            attempt.seed,
            attempt.rules_version,
            actions,
            payload["score_claim"],
            payload["level_claim"],
        )
        if not result.valid:
            submission.validation_result = json.dumps({"valid": False, "error": result.error})
            submission.validated_at = datetime.utcnow()
            self.db.commit()
            return {"success": False, "reason": result.error or "Validation failed", "entered_leaderboard": False}

        submission.score_actual = result.score
        submission.level_actual = result.level
        submission.validation_result = json.dumps({"valid": True, "breakdown": result.breakdown})
        submission.validated_at = datetime.utcnow()
        self.db.commit()

        entry = self.db.query(LeaderboardEntry).filter(LeaderboardEntry.user_id == user_id).first()
        score = result.score or 0
        level = result.level or 0
        actions_json = json.dumps(actions)
        if entry:
            if score <= entry.score:
                return {
                    "success": True,
                    "score": score,
                    "entered_leaderboard": False,
                    "reason": "Score not higher than existing",
                }
            entry.score = score
            entry.level = level
            entry.money = payload.get("money")
            entry.end_tick = payload.get("end_tick")
            entry.actions = actions_json
            entry.rules_version = attempt.rules_version
            entry.submitted_at = datetime.utcnow()
        else:
            entry = LeaderboardEntry(
                user_id=user_id,
                score=score,
                level=level,
                money=payload.get("money"),
                end_tick=payload.get("end_tick"),
                actions=actions_json,
                rules_version=attempt.rules_version,
                submitted_at=datetime.utcnow(),
            )
            self.db.add(entry)
        self.db.commit()

        return {
            "success": True,
            "score": score,
            "entered_leaderboard": True,
            "breakdown": result.breakdown or {},
        }
