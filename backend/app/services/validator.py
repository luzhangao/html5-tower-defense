import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, List
import httpx


@dataclass
class ValidationResult:
    valid: bool
    score: int | None = None
    level: int | None = None
    breakdown: Dict[str, Any] | None = None
    error: str | None = None


class ReplayValidator:
    def __init__(self, verifier_url: str | None = None):
        self.verifier_url = verifier_url or os.getenv("VERIFIER_URL", "http://localhost:3001")
        self.logger = logging.getLogger("td_api")

    async def validate(
        self,
        seed: int,
        rules_version: str,
        actions: List[Dict[str, Any]],
        claimed_score: int,
        claimed_level: int,
        final_tick: int | None = None,
    ) -> ValidationResult:
        # 发送给 verifier 的参数，与前端回放保持一致
        payload = {
            "seed": seed,
            "rulesVersion": rules_version,
            "actions": actions,
            "claimedScore": claimed_score,
            "claimedLevel": claimed_level,
            "finalTick": final_tick,
        }

        try:
            # 验证器在 Node 里复跑引擎
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.verifier_url}/api/verify-core",
                    json=payload,
                )
                if response.status_code != 200:
                    self.logger.warning(
                        "verifier status=%s body=%s",
                        response.status_code,
                        response.text,
                    )
                    return ValidationResult(valid=False, error=f"Verifier error: {response.text}")

                result = response.json()
                state = result.get("state") or {}
                self.logger.info(
                    "verifier result valid=%s score=%s level=%s",
                    result.get("valid"),
                    state.get("score"),
                    state.get("wave"),
                )
                return ValidationResult(
                    valid=result.get("valid", False),
                    score=state.get("score"),
                    level=state.get("wave"),
                    breakdown=state.get("breakdown"),
                    error=result.get("error"),
                )
        except httpx.TimeoutException:
            return ValidationResult(valid=False, error="Verification timeout")
        except Exception as exc:  # pylint: disable=broad-except
            self.logger.exception("verifier error")
            return ValidationResult(valid=False, error=f"Verification error: {exc}")
