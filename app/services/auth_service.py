from typing import Optional, Tuple, Dict
from sqlalchemy.orm import Session

from app.db import models


def verify_license(db: Session, api_key_plain: str) -> Tuple[Optional[models.ApiKey], Dict]:
    """Verify the API key and return license status payload.

    Returns (api_key_row, payload_dict)
    payload_dict includes: status, quota_remaining, reset_date, plan_tier
    """
    # Find API key by hash
    from app.utils.security import sha256_hex
    key_hash = sha256_hex(api_key_plain)
    api_key_row = db.query(models.ApiKey).filter(models.ApiKey.key_hash == key_hash).first()
    if not api_key_row or not api_key_row.active:
        return None, {"status": "blocked", "quota_remaining": 0, "reset_date": None, "plan_tier": None, "organization_id": None, "organization_name": None, "api_key_id": None}

    # Enforce organization status
    org = db.query(models.Organization).get(api_key_row.org_id)
    if not org or org.status != "active":
        return api_key_row, {"status": "blocked", "quota_remaining": 0, "reset_date": None, "plan_tier": org.plan_tier if org else None, "organization_id": api_key_row.org_id, "organization_name": org.name if org else None, "api_key_id": api_key_row.id}

    # Load active subscription and plan
    sub = (
        db.query(models.Subscription)
        .filter(models.Subscription.org_id == api_key_row.org_id, models.Subscription.status.in_(["active"]))
        .first()
    )
    if not sub:
        return api_key_row, {"status": "expired", "quota_remaining": 0, "reset_date": None, "plan_tier": org.plan_tier, "organization_id": api_key_row.org_id, "organization_name": org.name, "api_key_id": api_key_row.id}

    plan = sub.plan

    # Determine quota_remaining (None => unlimited)
    monthly_quota = plan.monthly_quota  # BigInteger or None
    quota_remaining = monthly_quota if monthly_quota is not None else None

    reset_date = sub.period_reset_date
    return api_key_row, {
        "status": "active" if api_key_row.active and sub.status == "active" else "expired",
        "quota_remaining": quota_remaining,
        "reset_date": reset_date,
        "plan_tier": org.plan_tier,
        "organization_id": api_key_row.org_id,
        "organization_name": org.name,
        "api_key_id": api_key_row.id,
    }

