"""
Admin endpoints for licensing enforcement management
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.db.database import SessionLocal
from app.db.models import Organization, ApiKey, Subscription
from app.services.auth_service import (
    disable_organization, 
    enable_organization, 
    disable_api_key, 
    enable_api_key,
    get_current_month_usage
)
from app.utils.admin_security import require_admin

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class OrganizationStatusUpdate(BaseModel):
    status: str  # active, disabled, suspended, blocked
    reason: Optional[str] = None

class ApiKeyStatusUpdate(BaseModel):
    active: bool
    reason: Optional[str] = None

class OrganizationResponse(BaseModel):
    id: int
    name: str
    status: str
    plan_tier: str
    login_email: Optional[str]
    disabled_at: Optional[str]
    disabled_reason: Optional[str]
    last_activity_at: Optional[str]
    auto_disable_on_quota_exceeded: bool
    quota_warning_sent: bool
    api_keys_count: int
    current_usage: int
    monthly_quota: Optional[int]

class ApiKeyResponse(BaseModel):
    id: int
    org_id: int
    active: bool
    disabled_at: Optional[str]
    disabled_reason: Optional[str]
    auto_disabled: bool
    last_used_at: Optional[str]
    total_requests: int
    organization_name: str
    organization_status: str

@router.get("/organizations", response_model=List[OrganizationResponse])
def list_organizations(db: Session = Depends(get_db), admin_user = Depends(require_admin)):
    """List all organizations with their status and usage"""
    orgs = db.query(Organization).all()
    result = []
    
    for org in orgs:
        # Count API keys
        api_keys_count = db.query(ApiKey).filter(ApiKey.org_id == org.id).count()
        
        # Get current usage
        current_usage = get_current_month_usage(db, org.id)
        
        # Get monthly quota from active subscription
        sub = db.query(Subscription).filter(
            Subscription.org_id == org.id,
            Subscription.status == "active"
        ).first()
        monthly_quota = sub.plan.monthly_quota if sub and sub.plan else None
        
        result.append(OrganizationResponse(
            id=org.id,
            name=org.name,
            status=org.status,
            plan_tier=org.plan_tier,
            login_email=org.login_email,
            disabled_at=org.disabled_at.isoformat() if org.disabled_at else None,
            disabled_reason=org.disabled_reason,
            last_activity_at=org.last_activity_at.isoformat() if org.last_activity_at else None,
            auto_disable_on_quota_exceeded=org.auto_disable_on_quota_exceeded,
            quota_warning_sent=org.quota_warning_sent,
            api_keys_count=api_keys_count,
            current_usage=current_usage,
            monthly_quota=monthly_quota
        ))
    
    return result

@router.put("/organizations/{org_id}/status")
def update_organization_status(
    org_id: int, 
    update: OrganizationStatusUpdate,
    db: Session = Depends(get_db), 
    admin_user = Depends(require_admin)
):
    """Update organization status (enable/disable)"""
    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if update.status == "disabled":
        success = disable_organization(db, org_id, update.reason or "Admin action")
    elif update.status == "active":
        success = enable_organization(db, org_id)
    else:
        # Update status directly for other values
        org.status = update.status
        if update.reason:
            org.disabled_reason = update.reason
        db.commit()
        success = True
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update organization status")
    
    return {"success": True, "message": f"Organization {org_id} status updated to {update.status}"}

@router.get("/api-keys", response_model=List[ApiKeyResponse])
def list_api_keys(db: Session = Depends(get_db), admin_user = Depends(require_admin)):
    """List all API keys with their status"""
    api_keys = db.query(ApiKey).join(Organization).all()
    result = []
    
    for api_key in api_keys:
        result.append(ApiKeyResponse(
            id=api_key.id,
            org_id=api_key.org_id,
            active=api_key.active,
            disabled_at=api_key.disabled_at.isoformat() if api_key.disabled_at else None,
            disabled_reason=api_key.disabled_reason,
            auto_disabled=api_key.auto_disabled,
            last_used_at=api_key.last_used_at.isoformat() if api_key.last_used_at else None,
            total_requests=api_key.total_requests or 0,
            organization_name=api_key.organization.name,
            organization_status=api_key.organization.status
        ))
    
    return result

@router.put("/api-keys/{api_key_id}/status")
def update_api_key_status(
    api_key_id: int,
    update: ApiKeyStatusUpdate,
    db: Session = Depends(get_db),
    admin_user = Depends(require_admin)
):
    """Update API key status (enable/disable)"""
    api_key = db.query(ApiKey).get(api_key_id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    if update.active:
        success = enable_api_key(db, api_key_id)
    else:
        success = disable_api_key(db, api_key_id, update.reason or "Admin action")
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update API key status")
    
    action = "enabled" if update.active else "disabled"
    return {"success": True, "message": f"API key {api_key_id} {action}"}

@router.post("/organizations/{org_id}/reset-quota-warning")
def reset_quota_warning(
    org_id: int,
    db: Session = Depends(get_db),
    admin_user = Depends(require_admin)
):
    """Reset quota warning flag for an organization"""
    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org.quota_warning_sent = False
    db.commit()
    
    return {"success": True, "message": f"Quota warning reset for organization {org_id}"}

@router.get("/organizations/{org_id}/usage-summary")
def get_organization_usage_summary(
    org_id: int,
    db: Session = Depends(get_db),
    admin_user = Depends(require_admin)
):
    """Get detailed usage summary for an organization"""
    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    current_usage = get_current_month_usage(db, org_id)
    
    # Get subscription info
    sub = db.query(Subscription).filter(
        Subscription.org_id == org_id,
        Subscription.status == "active"
    ).first()
    
    monthly_quota = sub.plan.monthly_quota if sub and sub.plan else None
    quota_percentage = (current_usage / monthly_quota * 100) if monthly_quota else 0
    
    # Get API keys info
    api_keys = db.query(ApiKey).filter(ApiKey.org_id == org_id).all()
    active_keys = [k for k in api_keys if k.active]
    disabled_keys = [k for k in api_keys if not k.active]
    
    return {
        "organization_id": org_id,
        "organization_name": org.name,
        "organization_status": org.status,
        "current_usage": current_usage,
        "monthly_quota": monthly_quota,
        "quota_percentage": quota_percentage,
        "quota_remaining": max(0, monthly_quota - current_usage) if monthly_quota else None,
        "api_keys_total": len(api_keys),
        "api_keys_active": len(active_keys),
        "api_keys_disabled": len(disabled_keys),
        "auto_disable_enabled": org.auto_disable_on_quota_exceeded,
        "quota_warning_sent": org.quota_warning_sent,
        "last_activity": org.last_activity_at.isoformat() if org.last_activity_at else None
    }
