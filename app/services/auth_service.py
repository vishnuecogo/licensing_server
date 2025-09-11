from typing import Optional, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.db import models


def verify_license(db: Session, api_key_plain: str, increment_usage: bool = True) -> Tuple[Optional[models.ApiKey], Dict]:
    """Verify the API key and return comprehensive license status payload.

    Returns (api_key_row, payload_dict)
    payload_dict includes: status, quota_remaining, reset_date, plan_tier, organization_status, etc.
    """
    # Find API key by hash
    from app.utils.security import sha256_hex
    key_hash = sha256_hex(api_key_plain)
    api_key_row = db.query(models.ApiKey).filter(models.ApiKey.key_hash == key_hash).first()

    if not api_key_row:
        return None, {
            "status": "invalid",
            "quota_remaining": 0,
            "reset_date": None,
            "plan_tier": None,
            "organization_id": None,
            "organization_name": None,
            "organization_status": None,
            "api_key_id": None,
            "error": "API key not found"
        }

    # Update last_used_at for valid API key only if incrementing usage
    if api_key_row.active and increment_usage:
        api_key_row.last_used_at = datetime.utcnow()
        api_key_row.total_requests = (api_key_row.total_requests or 0) + 1
        db.commit()

    if not api_key_row.active:
        return api_key_row, {
            "status": "disabled",
            "quota_remaining": 0,
            "reset_date": None,
            "plan_tier": None,
            "organization_id": api_key_row.org_id,
            "organization_name": None,
            "organization_status": None,
            "api_key_id": api_key_row.id,
            "disabled_at": api_key_row.disabled_at.isoformat() if api_key_row.disabled_at else None,
            "disabled_reason": api_key_row.disabled_reason,
            "auto_disabled": api_key_row.auto_disabled,
            "error": "API key is disabled"
        }

    # Enforce organization status with comprehensive checking
    org = db.query(models.Organization).get(api_key_row.org_id)
    if not org:
        return api_key_row, {
            "status": "blocked",
            "quota_remaining": 0,
            "reset_date": None,
            "plan_tier": None,
            "organization_id": api_key_row.org_id,
            "organization_name": None,
            "organization_status": "not_found",
            "api_key_id": api_key_row.id,
            "error": "Organization not found"
        }

    # Update organization last activity only if incrementing usage
    if increment_usage:
        org.last_activity_at = datetime.utcnow()
        db.commit()

    # Check organization status
    if org.status != "active":
        return api_key_row, {
            "status": "blocked",
            "quota_remaining": 0,
            "reset_date": None,
            "plan_tier": org.plan_tier,
            "organization_id": api_key_row.org_id,
            "organization_name": org.name,
            "organization_status": org.status,
            "api_key_id": api_key_row.id,
            "disabled_at": org.disabled_at.isoformat() if org.disabled_at else None,
            "disabled_reason": org.disabled_reason,
            "error": f"Organization is {org.status}"
        }

    # Load active subscription and plan
    sub = (
        db.query(models.Subscription)
        .filter(models.Subscription.org_id == api_key_row.org_id, models.Subscription.status.in_(["active"]))
        .first()
    )
    if not sub:
        return api_key_row, {
            "status": "expired",
            "quota_remaining": 0,
            "reset_date": None,
            "plan_tier": org.plan_tier,
            "organization_id": api_key_row.org_id,
            "organization_name": org.name,
            "organization_status": org.status,
            "api_key_id": api_key_row.id,
            "error": "No active subscription found"
        }

    plan = sub.plan

    # Calculate current usage and remaining quota
    current_usage = get_current_month_usage(db, api_key_row.org_id)
    monthly_quota = plan.monthly_quota  # BigInteger or None

    if monthly_quota is not None:
        quota_remaining = max(0, monthly_quota - current_usage)

        # Check if quota exceeded and auto-disable is enabled
        if quota_remaining <= 0 and org.auto_disable_on_quota_exceeded:
            # Auto-disable API key
            disable_api_key_for_quota_exceeded(db, api_key_row, current_usage, monthly_quota)
            return api_key_row, {
                "status": "quota_exceeded",
                "quota_remaining": 0,
                "reset_date": sub.period_reset_date,
                "plan_tier": org.plan_tier,
                "organization_id": api_key_row.org_id,
                "organization_name": org.name,
                "organization_status": org.status,
                "api_key_id": api_key_row.id,
                "current_usage": current_usage,
                "monthly_quota": monthly_quota,
                "auto_disabled": True,
                "error": "Quota exceeded - API key auto-disabled"
            }
    else:
        quota_remaining = None  # Unlimited

    reset_date = sub.period_reset_date
    return api_key_row, {
        "status": "active" if api_key_row.active and sub.status == "active" else "expired",
        "quota_remaining": quota_remaining,
        "reset_date": reset_date,
        "plan_tier": org.plan_tier,
        "organization_id": api_key_row.org_id,
        "organization_name": org.name,
        "organization_status": org.status,
        "api_key_id": api_key_row.id,
        "current_usage": current_usage,
        "monthly_quota": monthly_quota,
        "auto_disabled": False,
        "last_used_at": api_key_row.last_used_at.isoformat() if api_key_row.last_used_at else None,
        "total_requests": api_key_row.total_requests or 0
    }


def get_current_month_usage(db: Session, org_id: int) -> int:
    """Get current month's token usage for an organization"""
    from datetime import datetime
    current_month = datetime.utcnow().strftime('%Y-%m')

    # Get from monthly summary if available
    summary = db.query(models.MonthlyUsageSummary).filter(
        models.MonthlyUsageSummary.org_id == org_id,
        models.MonthlyUsageSummary.year_month == current_month
    ).first()

    if summary:
        return (summary.total_deepseek_tokens or 0) + (summary.total_openai_tokens or 0)

    # Fallback: calculate from usage logs for current month
    from sqlalchemy import extract
    current_year = datetime.utcnow().year
    current_month_num = datetime.utcnow().month

    result = db.query(func.sum(models.UsageLog.total_tokens)).filter(
        models.UsageLog.org_id == org_id,
        extract('year', models.UsageLog.timestamp) == current_year,
        extract('month', models.UsageLog.timestamp) == current_month_num
    ).scalar()

    return result or 0


def disable_api_key_for_quota_exceeded(db: Session, api_key: models.ApiKey, current_usage: int, quota_limit: int):
    """Disable API key when quota is exceeded"""
    api_key.active = False
    api_key.auto_disabled = True
    api_key.disabled_at = datetime.utcnow()
    api_key.disabled_reason = f"Quota exceeded: {current_usage}/{quota_limit} tokens used"
    db.commit()

    print(f"🚨 API key {api_key.id} auto-disabled for org {api_key.org_id} - quota exceeded ({current_usage}/{quota_limit})")


def disable_organization(db: Session, org_id: int, reason: str = "Manual disable") -> bool:
    """Disable an organization and all its API keys"""
    org = db.query(models.Organization).get(org_id)
    if not org:
        return False

    # Disable organization
    org.status = "disabled"
    org.disabled_at = datetime.utcnow()
    org.disabled_reason = reason

    # Disable all API keys for this organization
    api_keys = db.query(models.ApiKey).filter(models.ApiKey.org_id == org_id).all()
    for api_key in api_keys:
        if api_key.active:
            api_key.active = False
            api_key.disabled_at = datetime.utcnow()
            api_key.disabled_reason = f"Organization disabled: {reason}"

    db.commit()
    print(f"🚨 Organization {org_id} and {len(api_keys)} API keys disabled - {reason}")
    return True


def enable_organization(db: Session, org_id: int) -> bool:
    """Enable an organization (but keep API keys disabled for manual review)"""
    org = db.query(models.Organization).get(org_id)
    if not org:
        return False

    org.status = "active"
    org.disabled_at = None
    org.disabled_reason = None
    org.quota_warning_sent = False

    db.commit()
    print(f"✅ Organization {org_id} enabled - API keys remain disabled for manual review")
    return True


def disable_api_key(db: Session, api_key_id: int, reason: str = "Manual disable") -> bool:
    """Manually disable a specific API key"""
    api_key = db.query(models.ApiKey).get(api_key_id)
    if not api_key:
        return False

    api_key.active = False
    api_key.disabled_at = datetime.utcnow()
    api_key.disabled_reason = reason
    api_key.auto_disabled = False

    db.commit()
    print(f"🚨 API key {api_key_id} manually disabled - {reason}")
    return True


def enable_api_key(db: Session, api_key_id: int) -> bool:
    """Enable a specific API key"""
    api_key = db.query(models.ApiKey).get(api_key_id)
    if not api_key:
        return False

    # Check if organization is active
    org = db.query(models.Organization).get(api_key.org_id)
    if not org or org.status != "active":
        print(f"❌ Cannot enable API key {api_key_id} - organization {api_key.org_id} is not active")
        return False

    api_key.active = True
    api_key.disabled_at = None
    api_key.disabled_reason = None
    api_key.auto_disabled = False

    db.commit()
    print(f"✅ API key {api_key_id} enabled")
    return True


def auto_enable_quota_disabled_keys(db: Session, org_id: int) -> int:
    """Auto-enable API keys that were disabled due to quota exceeded when plan is upgraded"""
    # Find all API keys for this organization that were auto-disabled due to quota
    disabled_keys = db.query(models.ApiKey).filter(
        models.ApiKey.org_id == org_id,
        models.ApiKey.active == False,
        models.ApiKey.auto_disabled == True,
        models.ApiKey.disabled_reason.like("Quota exceeded%")
    ).all()

    enabled_count = 0
    for api_key in disabled_keys:
        if enable_api_key(db, api_key.id):
            enabled_count += 1
            print(f"🔄 Auto-enabled API key {api_key.id} after plan upgrade")

    return enabled_count

