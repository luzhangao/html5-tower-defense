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
        self.verifier_url = verifier_url or os.getenv("VERIFIER_URL", "http://localhost:3001")

    async def validate(
        self,
        seed: int,
        rules_version: str,
        actions: List[Dict[str, Any]],
        claimed_score: int,
        claimed_level: int,
        final_tick: int | None = None,
    ) -> ValidationResult:
        payload = {
            "seed": seed,
            "rulesVersion": rules_version,
            "actions": actions,
            "claimedScore": claimed_score,
            "claimedLevel": claimed_level,
            "finalTick": final_tick,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.verifier_url}/api/verify-core",
                    json=payload,
                )
                if response.status_code != 200:
                    print(f"[validator] verifier status={response.status_code} body={response.text}")
                    return ValidationResult(valid=False, error=f"Verifier error: {response.text}")

                result = response.json()
                state = result.get("state") or {}
                print(f"[validator] verifier result valid={result.get('valid')} score={state.get('score')} level={state.get('wave')}")
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
            print(f"[validator] error: {exc}")
            return ValidationResult(valid=False, error=f"Verification error: {exc}")
