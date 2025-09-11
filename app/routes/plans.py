from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.database import SessionLocal
from app.db.models import Plan, Organization, Subscription
from app.routes.admin import get_admin
from app.services.auth_service import auto_enable_quota_disabled_keys

router = APIRouter(prefix="/admin/plan-management", tags=["Plan Management"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CreatePlanBody(BaseModel):
    name: str
    monthly_quota: Optional[int] = None  # None for unlimited
    price: float
    description: Optional[str] = None
    features: Optional[str] = None  # JSON string of features

class UpdatePlanBody(BaseModel):
    name: Optional[str] = None
    monthly_quota: Optional[int] = None
    price: Optional[float] = None
    description: Optional[str] = None
    features: Optional[str] = None

class CustomPlanBody(BaseModel):
    organization_id: int
    name: str
    monthly_quota: Optional[int] = None
    price: float
    description: Optional[str] = None
    features: Optional[str] = None

@router.get("/")
def get_plans(
    db: Session = Depends(get_db),
    admin = Depends(get_admin),
    global_only: bool = False
):
    """Get all plans or only global plans"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    query = db.query(Plan)

    # Filter for global plans only (exclude custom plans)
    if global_only:
        query = query.filter(~Plan.name.like("Custom-%"))

    plans = query.all()

    # Add subscription count for each plan
    plan_data = []
    for plan in plans:
        subscription_count = db.query(Subscription).filter(
            Subscription.plan_id == plan.id,
            Subscription.status == "active"
        ).count()

        plan_dict = {
            "id": plan.id,
            "name": plan.name,
            "monthly_quota": plan.monthly_quota,
            "price": float(plan.price),
            "description": plan.description,
            "features": plan.features,
            "subscription_count": subscription_count,
            "is_custom": plan.name.startswith("Custom-")
        }
        plan_data.append(plan_dict)

    return {"plans": plan_data}

@router.post("/")
def create_plan(body: CreatePlanBody, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Create a new plan"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    
    # Check if plan name already exists
    existing_plan = db.query(Plan).filter(Plan.name == body.name).first()
    if existing_plan:
        raise HTTPException(status_code=400, detail="Plan name already exists")
    
    plan = Plan(
        name=body.name,
        monthly_quota=body.monthly_quota,
        price=body.price,
        description=body.description,
        features=body.features
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    return plan

@router.put("/{plan_id}")
def update_plan(plan_id: int, body: UpdatePlanBody, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Update an existing plan"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    
    plan = db.query(Plan).get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Update fields if provided
    if body.name is not None:
        # Check if new name already exists
        existing_plan = db.query(Plan).filter(Plan.name == body.name, Plan.id != plan_id).first()
        if existing_plan:
            raise HTTPException(status_code=400, detail="Plan name already exists")
        plan.name = body.name
    
    if body.monthly_quota is not None:
        plan.monthly_quota = body.monthly_quota
    if body.price is not None:
        plan.price = body.price
    if body.description is not None:
        plan.description = body.description
    if body.features is not None:
        plan.features = body.features
    
    db.commit()
    db.refresh(plan)
    
    return plan

@router.post("/custom")
def create_custom_plan(body: CustomPlanBody, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Create a custom plan for a specific organization"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    
    # Check if organization exists
    organization = db.query(Organization).get(body.organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Create custom plan name
    custom_plan_name = f"Custom-{organization.name}-{body.name}"
    
    # Check if custom plan already exists
    existing_plan = db.query(Plan).filter(Plan.name == custom_plan_name).first()
    if existing_plan:
        raise HTTPException(status_code=400, detail="Custom plan already exists for this organization")
    
    # Create custom plan
    plan = Plan(
        name=custom_plan_name,
        monthly_quota=body.monthly_quota,
        price=body.price,
        description=body.description or f"Custom plan for {organization.name}",
        features=body.features
    )
    db.add(plan)
    db.flush()  # Get the plan ID
    
    # Update organization to use custom plan
    organization.plan_tier = "custom"
    
    # Create or update subscription
    existing_subscription = db.query(Subscription).filter(
        Subscription.org_id == body.organization_id,
        Subscription.status == "active"
    ).first()
    
    if existing_subscription:
        existing_subscription.plan_id = plan.id
    else:
        subscription = Subscription(
            org_id=body.organization_id,
            plan_id=plan.id,
            status="active",
            period_reset_date="2099-12-31"
        )
        db.add(subscription)
    
    db.commit()
    db.refresh(plan)
    
    return {
        "plan": plan,
        "organization": organization,
        "message": f"Custom plan created for {organization.name}"
    }

@router.delete("/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Delete a plan (only if no active subscriptions)"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    
    plan = db.query(Plan).get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check for active subscriptions
    active_subscriptions = db.query(Subscription).filter(
        Subscription.plan_id == plan_id,
        Subscription.status == "active"
    ).count()
    
    if active_subscriptions > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete plan with {active_subscriptions} active subscriptions"
        )
    
    # Delete the plan
    db.delete(plan)
    db.commit()
    
    return {"message": f"Plan '{plan.name}' has been deleted"}

@router.get("/organization/{org_id}")
def get_organization_plan(org_id: int, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Get the current plan for an organization"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    
    organization = db.query(Organization).get(org_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Get active subscription
    subscription = db.query(Subscription).filter(
        Subscription.org_id == org_id,
        Subscription.status == "active"
    ).first()
    
    if subscription:
        plan = db.query(Plan).get(subscription.plan_id)
        return {
            "organization": organization,
            "plan": plan,
            "subscription": subscription
        }
    else:
        return {
            "organization": organization,
            "plan": None,
            "subscription": None
        }

@router.post("/organization/{org_id}/assign/{plan_id}")
def assign_plan_to_organization(org_id: int, plan_id: int, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Assign a plan to an organization"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    
    organization = db.query(Organization).get(org_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    plan = db.query(Plan).get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Update organization plan tier
    if plan.name.startswith("Custom-"):
        organization.plan_tier = "custom"
    else:
        organization.plan_tier = plan.name
    
    # Update or create subscription
    existing_subscription = db.query(Subscription).filter(
        Subscription.org_id == org_id,
        Subscription.status == "active"
    ).first()
    
    if existing_subscription:
        existing_subscription.plan_id = plan_id
    else:
        subscription = Subscription(
            org_id=org_id,
            plan_id=plan_id,
            status="active",
            period_reset_date="2099-12-31"
        )
        db.add(subscription)
    
    db.commit()

    # Auto-enable API keys that were disabled due to quota exceeded
    enabled_count = auto_enable_quota_disabled_keys(db, org_id)

    message = f"Plan '{plan.name}' assigned to '{organization.name}'"
    if enabled_count > 0:
        message += f" and {enabled_count} API key(s) re-enabled"

    return {
        "message": message,
        "organization": organization,
        "plan": plan,
        "api_keys_enabled": enabled_count
    }
