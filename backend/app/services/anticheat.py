from datetime import datetime, timedelta
from backend.app.models.submission import Submission
from backend.app.models.leaderboard import LeaderboardEntry


class RateLimitError(Exception):
    pass


class AntiCheatService:
    RATE_LIMIT_WINDOW = 300
    MAX_SUBMISSIONS_PER_WINDOW = 10
    TOP_THRESHOLD_MARGIN = 20

    @staticmethod
    def check_rate_limit(user_id, db):
        cutoff_time = datetime.utcnow() - timedelta(seconds=AntiCheatService.RATE_LIMIT_WINDOW)
        recent_count = (
            db.query(Submission)
            .filter(Submission.user_id == user_id, Submission.submitted_at > cutoff_time)
            .count()
        )
        if recent_count >= AntiCheatService.MAX_SUBMISSIONS_PER_WINDOW:
            raise RateLimitError("Too many submissions. Please wait.")

    @staticmethod
    def get_entry_threshold(db):
        entries = (
            db.query(LeaderboardEntry)
            .order_by(LeaderboardEntry.score.desc())
            .limit(100 + AntiCheatService.TOP_THRESHOLD_MARGIN)
            .all()
        )
        if len(entries) < 100 + AntiCheatService.TOP_THRESHOLD_MARGIN:
            return 0
        return entries[99 + AntiCheatService.TOP_THRESHOLD_MARGIN].score

    @staticmethod
    def is_suspicious_pattern(actions):
        if not actions:
            return True
        intervals = []
        for i in range(1, len(actions)):
            intervals.append(actions[i]["t"] - actions[i - 1]["t"])
        return len(intervals) > 10 and len(set(intervals)) == 1
