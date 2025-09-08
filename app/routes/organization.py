from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import hashlib

from app.db.database import SessionLocal
from app.db.models import Organization, Plan, Subscription, ApiKey
from app.services.unified_auth import get_user_from_token
from app.utils.security import sha256_hex
import secrets
import string

router = APIRouter(prefix="/organization", tags=["Organization Self-Management"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_organization_from_token(auth_header: str = Header(None, alias="Authorization"), db: Session = Depends(get_db)):
    """Extract organization from JWT token"""
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = auth_header.split(" ", 1)[1]
    user_data = get_user_from_token(token)
    
    if not user_data or user_data.get('role') != 'organization':
        raise HTTPException(status_code=403, detail="Organization access required")
    
    org_id = user_data.get('id')
    organization = db.query(Organization).get(org_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return organization

class UpdateOrganizationSettingsBody(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[str] = None

class PasswordResetBody(BaseModel):
    current_password: str
    new_password: str

class CreateApiKeyBody(BaseModel):
    plaintext_key: str
    active: bool = True

@router.get("/profile")
def get_organization_profile(organization: Organization = Depends(get_organization_from_token)):
    """Get organization profile information"""
    return {
        "id": organization.id,
        "name": organization.name,
        "plan_tier": organization.plan_tier,
        "contact_email": organization.contact_email,
        "login_email": organization.login_email,
        "status": organization.status,
        "created_at": organization.created_at,
        "can_reset_password": organization.can_reset_password
    }

@router.put("/profile")
def update_organization_profile(
    body: UpdateOrganizationSettingsBody,
    organization: Organization = Depends(get_organization_from_token),
    db: Session = Depends(get_db)
):
    """Update organization profile settings"""
    if body.name is not None:
        organization.name = body.name
    if body.contact_email is not None:
        organization.contact_email = body.contact_email
    
    db.commit()
    db.refresh(organization)
    return organization

@router.get("/subscription")
def get_organization_subscription(
    organization: Organization = Depends(get_organization_from_token),
    db: Session = Depends(get_db)
):
    """Get organization's current subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.org_id == organization.id,
        Subscription.status == "active"
    ).first()
    
    if not subscription:
        return {"message": "No active subscription found"}
    
    # Get plan details
    plan = db.query(Plan).get(subscription.plan_id)
    if not plan:
        return {"message": "Plan not found"}
    
    return {
        "subscription_id": subscription.id,
        "plan_id": plan.id,
        "plan_name": plan.name,
        "monthly_quota": plan.monthly_quota,
        "price": float(plan.price),
        "description": plan.description,
        "features": plan.features,
        "status": subscription.status,
        "period_reset_date": subscription.period_reset_date
    }

@router.get("/api-keys")
def get_organization_api_keys(
    organization: Organization = Depends(get_organization_from_token),
    db: Session = Depends(get_db)
):
    """Get organization's API keys"""
    api_keys = db.query(ApiKey).filter(ApiKey.org_id == organization.id).all()
    
    return {
        "items": [
            {
                "id": key.id,
                "key_hash": key.key_hash[:20] + "...",  # Show partial hash for identification
                "active": key.active,
                "created_at": key.created_at
            }
            for key in api_keys
        ]
    }

@router.post("/api-keys")
def create_organization_api_key(
    body: CreateApiKeyBody,
    organization: Organization = Depends(get_organization_from_token),
    db: Session = Depends(get_db)
):
    """Create a new API key for the organization"""
    # Hash the API key
    key_hash = sha256_hex(body.plaintext_key)
    
    # Check if key already exists
    existing_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()
    if existing_key:
        raise HTTPException(status_code=400, detail="API key already exists")
    
    # Create new API key
    api_key = ApiKey(
        org_id=organization.id,
        key_hash=key_hash,
        active=body.active
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    return {
        "id": api_key.id,
        "message": "API key created successfully",
        "active": api_key.active,
        "created_at": api_key.created_at
    }

@router.delete("/api-keys/{key_id}")
def delete_organization_api_key(
    key_id: int,
    organization: Organization = Depends(get_organization_from_token),
    db: Session = Depends(get_db)
):
    """Delete an organization's API key"""
    api_key = db.query(ApiKey).filter(
        ApiKey.id == key_id,
        ApiKey.org_id == organization.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    db.delete(api_key)
    db.commit()
    
    return {"message": "API key deleted successfully"}

@router.put("/api-keys/{key_id}")
def update_organization_api_key(
    key_id: int,
    active: bool,
    organization: Organization = Depends(get_organization_from_token),
    db: Session = Depends(get_db)
):
    """Update an organization's API key status"""
    api_key = db.query(ApiKey).filter(
        ApiKey.id == key_id,
        ApiKey.org_id == organization.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    api_key.active = active
    db.commit()
    db.refresh(api_key)
    
    return {
        "id": api_key.id,
        "active": api_key.active,
        "message": f"API key {'activated' if active else 'deactivated'} successfully"
    }

@router.get("/custom-plans")
def get_organization_custom_plans(
    organization: Organization = Depends(get_organization_from_token),
    db: Session = Depends(get_db)
):
    """Get custom plans for the organization"""
    # Get custom plans that start with the organization name
    custom_plans = db.query(Plan).filter(
        Plan.name.like(f"Custom-{organization.name}%")
    ).all()
    
    return {
        "items": [
            {
                "id": plan.id,
                "name": plan.name,
                "monthly_quota": plan.monthly_quota,
                "price": float(plan.price),
                "description": plan.description,
                "features": plan.features
            }
            for plan in custom_plans
        ]
    }

@router.post("/password-reset")
def reset_organization_password(
    body: PasswordResetBody,
    organization: Organization = Depends(get_organization_from_token),
    db: Session = Depends(get_db)
):
    """Reset organization password"""
    if not organization.can_reset_password:
        raise HTTPException(status_code=403, detail="Password reset not allowed for this organization")
    
    # Verify current password
    from app.utils.admin_security import verify_password, hash_password
    if not verify_password(body.current_password, organization.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    organization.password_hash = hash_password(body.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}
