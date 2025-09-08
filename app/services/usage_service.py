from typing import Dict
from sqlalchemy.orm import Session

from app.db import models
from app.utils.security import sha256_hex


def accept_usage_report(
    db: Session,
    org_id: int,
    api_key_id: int,
    tokens_used: int,
    requests_count: int,
    bearer_key_plain: str,
) -> Dict:
    """Accept usage reports. Validate that the bearer key matches the api_key_id & org_id and is active.
    Extend to persist usage aggregates as needed.
    """
    key_hash = sha256_hex(bearer_key_plain)

    api_key = (
        db.query(models.ApiKey)
        .filter(
            models.ApiKey.id == api_key_id,
            models.ApiKey.org_id == org_id,
            models.ApiKey.key_hash == key_hash,
            models.ApiKey.active.is_(True),
        )
        .first()
    )
    if not api_key:
        return {"ok": False, "error": "auth_mismatch_or_inactive"}

    return {
        "ok": True,
        "acknowledged": {
            "org_id": org_id,
            "api_key_id": api_key_id,
            "tokens_used": tokens_used,
            "requests_count": requests_count,
        },
    }

