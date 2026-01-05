import json
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
        self.verifier_url = verifier_url or os.getenv("VERIFIER_URL", "http://localhost:3000")

    async def validate(
        self,
        seed: int,
        rules_version: str,
        actions: List[Dict[str, Any]],
        claimed_score: int,
        claimed_level: int,
    ) -> ValidationResult:
        payload = {
            "seed": seed,
            "rulesVersion": rules_version,
            "actions": actions,
            "claimedScore": claimed_score,
            "claimedLevel": claimed_level,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.verifier_url}/api/verify",
                    json=payload,
                )
                if response.status_code != 200:
                    return ValidationResult(valid=False, error=f"Verifier error: {response.text}")

                result = response.json()
                return ValidationResult(
                    valid=result.get("valid", False),
                    score=result.get("score"),
                    level=result.get("level"),
                    breakdown=result.get("breakdown"),
                    error=result.get("error"),
                )
        except httpx.TimeoutException:
            return ValidationResult(valid=False, error="Verification timeout")
        except Exception as exc:  # pylint: disable=broad-except
            return ValidationResult(valid=False, error=f"Verification error: {exc}")
