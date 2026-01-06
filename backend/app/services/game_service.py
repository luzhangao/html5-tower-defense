import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
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
        self.logger = logging.getLogger("td_api")

    def start_game(self, user_id: str, rules_version: str) -> dict:
        # 创建一次排行榜尝试：分配 seed 与过期时间
        attempt_id = uuid.uuid4().hex
        seed = uuid.uuid4().int % 2_147_483_647
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=60)
        attempt = Attempt(
            attempt_id=attempt_id,
            user_id=user_id,
            seed=seed,
            rules_version=rules_version,
            created_at=now,
            expires_at=expires_at,
            used=False,
        )
        self.db.add(attempt)
        self.db.commit()
        expires_at_iso = expires_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        return {
            "attempt_id": attempt_id,
            "seed": seed,
            "rules_version": rules_version,
            "expires_at": expires_at_iso,
        }

    async def submit_score(self, user_id: str, payload: dict) -> dict:
        # 提交成绩的完整流程：校验尝试 -> 反作弊 -> 回放验证 -> 写榜
        self.logger.info("submit_score user_id=%s attempt_id=%s", user_id, payload.get("attempt_id"))
        AntiCheatService.check_rate_limit(user_id, self.db)

        attempt = self.db.query(Attempt).filter(Attempt.attempt_id == payload["attempt_id"]).first()
        if not attempt or attempt.user_id != user_id:
            self.logger.warning("invalid attempt user_id=%s attempt_id=%s", user_id, payload.get("attempt_id"))
            return {"success": False, "reason": "Invalid attempt"}
        if attempt.used:
            self.logger.warning("attempt already used user_id=%s attempt_id=%s", user_id, payload.get("attempt_id"))
            return {"success": False, "reason": "Attempt already used"}
        expires_at = attempt.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            self.logger.warning("attempt expired user_id=%s attempt_id=%s", user_id, payload.get("attempt_id"))
            return {"success": False, "reason": "Attempt expired"}
        if attempt.rules_version != payload["rules_version"]:
            self.logger.warning(
                "rules version mismatch user_id=%s attempt_id=%s",
                user_id,
                payload.get("attempt_id"),
            )
            return {"success": False, "reason": "Rules version mismatch"}

        actions = payload.get("actions") or []
        if AntiCheatService.is_suspicious_pattern(actions):
            self.logger.warning("suspicious actions user_id=%s attempt_id=%s", user_id, payload.get("attempt_id"))
            return {"success": False, "reason": "Suspicious actions"}

        submission = Submission(
            attempt_id=attempt.attempt_id,
            user_id=user_id,
            score_claim=payload["score_claim"],
            level_claim=payload["level_claim"],
            actions=json.dumps(actions),
            submitted_at=datetime.now(timezone.utc),
        )
        self.db.add(submission)
        attempt.used = True
        attempt.used_at = datetime.now(timezone.utc)
        self.db.commit()

        # 排行榜入榜阈值：分数过低直接不入榜
        threshold = AntiCheatService.get_entry_threshold(self.db)
        if payload["score_claim"] < threshold:
            self.logger.info(
                "below threshold user_id=%s score_claim=%s threshold=%s",
                user_id,
                payload["score_claim"],
                threshold,
            )
            return {
                "success": True,
                "score": payload["score_claim"],
                "entered_leaderboard": False,
                "threshold": threshold,
                "reason": "Score below threshold",
            }

        self.logger.info("validating replay user_id=%s attempt_id=%s", user_id, payload.get("attempt_id"))
        # 调用验证器复算 score/level
        result = await self.validator.validate(
            attempt.seed,
            attempt.rules_version,
            actions,
            payload["score_claim"],
            payload["level_claim"],
            payload.get("end_tick"),
        )
        if not result.valid:
            self.logger.warning(
                "validation failed user_id=%s attempt_id=%s error=%s",
                user_id,
                payload.get("attempt_id"),
                result.error,
            )
            submission.validation_result = json.dumps({"valid": False, "error": result.error})
            submission.validated_at = datetime.now(timezone.utc)
            self.db.commit()
            return {"success": False, "reason": result.error or "Validation failed", "entered_leaderboard": False}

        submission.score_actual = result.score
        submission.level_actual = result.level
        submission.validation_result = json.dumps({"valid": True, "breakdown": result.breakdown})
        submission.validated_at = datetime.now(timezone.utc)
        self.db.commit()

        # 同一用户只保留最高分
        entry = self.db.query(LeaderboardEntry).filter(LeaderboardEntry.user_id == user_id).first()
        score = result.score or 0
        level = result.level or 0
        actions_json = json.dumps(actions)
        if entry:
            if score <= entry.score:
                self.logger.info(
                    "score not higher user_id=%s score=%s existing=%s",
                    user_id,
                    score,
                    entry.score,
                )
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
            entry.submitted_at = datetime.now(timezone.utc)
        else:
            entry = LeaderboardEntry(
                user_id=user_id,
                score=score,
                level=level,
                money=payload.get("money"),
                end_tick=payload.get("end_tick"),
                actions=actions_json,
                rules_version=attempt.rules_version,
                submitted_at=datetime.now(timezone.utc),
            )
            self.db.add(entry)
        self.db.commit()

        return {
            "success": True,
            "score": score,
            "entered_leaderboard": True,
            "breakdown": result.breakdown or {},
        }
