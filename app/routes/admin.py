from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
import hashlib

from app.db.database import SessionLocal
from app.db.admin_models import AdminUser
from app.db.models import Organization, Plan, Subscription, ApiKey, UsageLog, MonthlyUsageSummary, UserActivity
from app.utils.admin_security import verify_password, hash_password, create_access_token, decode_token
from app.services.unified_auth import authenticate_user, get_user_from_token
from app.utils.security import sha256_hex
import secrets
import string

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/debug-route")
def debug_route():
    return {"debug": "working"}

# Helper functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    """Extract API key from X-API-Key header"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header is required")
    return x_api_key

def hash_api_key(api_key: str) -> str:
    """Hash an API key using SHA256"""
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()

class LoginBody(BaseModel):
    email: str  # allow local dev domains like .local
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str  # "admin" or "organization"
    user_data: dict

class CreateOrganizationBody(BaseModel):
    name: str
    plan_tier: str = "free"
    contact_email: str
    login_email: str
    generate_password: bool = True
    custom_password: str = None

class UpdateOrganizationBody(BaseModel):
    name: str = None
    plan_tier: str = None
    contact_email: str = None
    status: str = None

class ResetPasswordBody(BaseModel):
    generate_password: bool = True
    custom_password: str = None


def get_admin(db: Session = Depends(get_db), auth_header: str = Header(None, alias="Authorization")):
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth_header.split(" ", 1)[1]
    try:
        data = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if data.get("role") not in ("admin", "viewer"):
        raise HTTPException(status_code=403, detail="Insufficient role")
    user = db.query(AdminUser).filter(AdminUser.email == data.get("sub"), AdminUser.active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

@router.post("/login", response_model=TokenResponse)
def unified_login(body: LoginBody, db = Depends(get_db)):
    """
    Unified login endpoint that authenticates both admin users and organizations.
    Returns user type and appropriate dashboard access.
    """
    auth_result = authenticate_user(db, body.email, body.password)

    if not auth_result.success:
        raise HTTPException(status_code=401, detail=auth_result.error)

    # Enrich user_data for organization users with API key presence info
    user_data = dict(auth_result.user_data or {})
    if auth_result.user_type == "organization" and user_data.get("id") is not None:
        api_keys_count = db.query(ApiKey).filter(ApiKey.org_id == user_data["id"]).count()
        user_data["api_keys_count"] = api_keys_count
        user_data["needs_api_key"] = api_keys_count == 0

    return TokenResponse(
        access_token=auth_result.token,
        user_type=auth_result.user_type,
        user_data=user_data
    )

# Standard pagination helper
from typing import Optional
from fastapi import Query

def paginate(query, page: int, page_size: int):
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}

# CRUD: Plans
class PlanBody(BaseModel):
    name: str
    monthly_quota: int | None = None
    price: float = 0.0

@router.get("/plans")
def list_plans(
    db = Depends(get_db),
    _ = Depends(get_admin),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    global_only: bool = Query(False, description="Return only global plans (free, pro)")
):
    qry = db.query(Plan)
    if q:
        qry = qry.filter(Plan.name.ilike(f"%{q}%"))

    # Filter for global plans only (exclude custom plans)
    if global_only:
        qry = qry.filter(~Plan.name.like("Custom-%"))

    qry = qry.order_by(Plan.id.desc())
    return paginate(qry, page, page_size)

@router.post("/plans")
def create_plan(body: PlanBody, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    if db.query(Plan).filter(Plan.name == body.name).first():
        raise HTTPException(status_code=400, detail="Plan name exists")
    plan = Plan(name=body.name, monthly_quota=body.monthly_quota, price=body.price)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.put("/plans/{plan_id}")
def update_plan(plan_id: int, body: PlanBody, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    plan = db.query(Plan).get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Not found")
    plan.name = body.name
    plan.monthly_quota = body.monthly_quota
    plan.price = body.price
    db.commit()
    db.refresh(plan)
    return plan

@router.delete("/plans/{plan_id}")
def delete_plan(plan_id: int, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    plan = db.query(Plan).get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(plan)
    db.commit()
    return {"ok": True}

# CRUD: Organizations
class OrgBody(BaseModel):
    name: str
    plan_tier: str = "free"
    contact_email: str | None = None
    status: str = "active"

@router.get("/orgs")
def list_orgs(
    db = Depends(get_db),
    _ = Depends(get_admin),
    q: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    qry = db.query(Organization)
    if q:
        qry = qry.filter(Organization.name.ilike(f"%{q}%"))
    if status:
        qry = qry.filter(Organization.status == status)
    qry = qry.order_by(Organization.id.desc())
    return paginate(qry, page, page_size)

@router.post("/orgs")
def create_org(body: OrgBody, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    org = Organization(name=body.name, plan_tier=body.plan_tier, contact_email=body.contact_email, status=body.status)
    db.add(org)
    db.flush()

    # Ensure organization has an active subscription aligned with plan_tier
    plan = db.query(Plan).filter(Plan.name == body.plan_tier).first()
    if plan:
        existing_subscription = db.query(Subscription).filter(
            Subscription.org_id == org.id,
            Subscription.status == "active"
        ).first()
        if not existing_subscription:
            subscription = Subscription(
                org_id=org.id,
                plan_id=plan.id,
                status="active",
                period_reset_date="2099-12-31"
            )
            db.add(subscription)
    else:
        # If the specified plan_tier doesn't exist, create a sensible default free subscription
        default_plan = db.query(Plan).filter(Plan.name == "free").first()
        if default_plan:
            subscription = Subscription(
                org_id=org.id,
                plan_id=default_plan.id,
                status="active",
                period_reset_date="2099-12-31"
            )
            db.add(subscription)

    db.commit()
    db.refresh(org)
    return org

@router.put("/orgs/{org_id}")
def update_org(org_id: int, body: OrgBody, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Not found")

    # If plan_tier is changing, update subscription
    if org.plan_tier != body.plan_tier:
        # Find the new plan
        new_plan = db.query(Plan).filter(Plan.name == body.plan_tier).first()
        if not new_plan:
            raise HTTPException(status_code=400, detail=f"Plan '{body.plan_tier}' not found")

        # Update or create subscription
        existing_subscription = db.query(Subscription).filter(
            Subscription.org_id == org_id,
            Subscription.status == "active"
        ).first()

        if existing_subscription:
            existing_subscription.plan_id = new_plan.id
        else:
            subscription = Subscription(
                org_id=org_id,
                plan_id=new_plan.id,
                status="active",
                period_reset_date="2099-12-31"
            )
            db.add(subscription)

    org.name = body.name
    org.plan_tier = body.plan_tier
    org.contact_email = body.contact_email
    org.status = body.status
    db.commit()
    db.refresh(org)
    return org



@router.delete("/orgs/{org_id}")
def delete_org(org_id: int, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(org)
    db.commit()
    return {"ok": True}

# CRUD: API Keys
class ApiKeyCreateBody(BaseModel):
    org_id: int
    plaintext_key: str
    active: bool = True

@router.get("/api-keys")
def list_api_keys(
    db = Depends(get_db), _ = Depends(get_admin),
    org_id: int | None = Query(None), active: bool | None = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
):
    qry = db.query(ApiKey)
    if org_id is not None:
        qry = qry.filter(ApiKey.org_id == org_id)
    if active is not None:
        qry = qry.filter(ApiKey.active.is_(active))
    qry = qry.order_by(ApiKey.id.desc())

    # Get paginated results
    result = paginate(qry, page, page_size)

    # Convert items to dictionaries and add masked key display
    formatted_items = []
    print(f"DEBUG: Processing {len(result.get('items', []))} items")
    for item in result.get('items', []):
        item_dict = {
            "id": item.id,
            "org_id": item.org_id,
            "active": item.active,
            "created_at": item.created_at,
            "key_hash": item.key_hash
        }
        # Add masked key display for security
        if item.key_hash:
            item_dict["key_display"] = f"evakey_****_****_{item.key_hash[-8:]}"
            print(f"DEBUG: Added key_display: {item_dict['key_display']}")
        formatted_items.append(item_dict)

    result["items"] = formatted_items
    print(f"DEBUG: Returning {len(formatted_items)} formatted items")
    return result

@router.post("/api-keys")
def create_api_key(body: ApiKeyCreateBody, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    # Store SHA256 hex of the key; do not store plaintext
    import hashlib
    h = hashlib.sha256(body.plaintext_key.encode("utf-8")).hexdigest()
    if db.query(ApiKey).filter(ApiKey.key_hash == h).first():
        raise HTTPException(status_code=400, detail="Key already exists")
    key = ApiKey(org_id=body.org_id, key_hash=h, active=body.active)
    db.add(key)
    db.commit()
    db.refresh(key)

    # Return the key with the plaintext for one-time display
    key_dict = {
        "id": key.id,
        "org_id": key.org_id,
        "active": key.active,
        "created_at": key.created_at,
        "plaintext_key": body.plaintext_key,  # One-time display only
        "key_display": f"evakey_****_****_{h[-8:]}"
    }
    return key_dict

class ApiKeyUpdateBody(BaseModel):
    active: bool

@router.put("/api-keys/{key_id}")
def update_api_key(key_id: int, body: ApiKeyUpdateBody, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    key = db.query(ApiKey).get(key_id)
    if not key:
        raise HTTPException(status_code=404, detail="Not found")
    key.active = body.active
    db.commit()
    db.refresh(key)
    return key

@router.delete("/api-keys/{key_id}")
def delete_api_key(key_id: int, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    key = db.query(ApiKey).get(key_id)
    if not key:
        raise HTTPException(status_code=404, detail="Not found")

    # Delete related usage logs first to avoid foreign key constraint violation
    db.query(UsageLog).filter(UsageLog.api_key_id == key_id).delete()

    # Now delete the API key
    db.delete(key)
    db.commit()
    return {"ok": True}

# API Key Verification Endpoint
@router.get("/verify")
def verify_api_key(api_key: str = Depends(get_api_key), db: Session = Depends(get_db)):
    """Verify an API key and return license information"""
    # Get organization from API key
    api_key_obj = db.query(ApiKey).filter(ApiKey.key_hash == hash_api_key(api_key)).first()
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Check if API key is active
    if not api_key_obj.active:
        raise HTTPException(status_code=401, detail="API key is inactive")

    # Get organization
    organization = db.query(Organization).get(api_key_obj.org_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check organization status
    if organization.status != "active":
        raise HTTPException(status_code=403, detail=f"Organization is {organization.status}")

    # Get active subscription
    subscription = db.query(Subscription).filter(
        Subscription.org_id == organization.id,
        Subscription.status == "active"
    ).first()

    if not subscription:
        # Return basic info for organizations without subscriptions
        return {
            "status": "active",
            "quota_remaining": 1000,  # Default quota
            "reset_date": "2099-12-31T23:59:59Z",
            "plan_tier": "free",
            "organization_id": organization.id,
            "organization_name": organization.name
        }

    # Get plan details
    plan = subscription.plan
    if not plan:
        raise HTTPException(status_code=500, detail="No plan associated with subscription")

    # Calculate quota remaining (for now, return plan quota since we don't track usage yet)
    quota_remaining = plan.monthly_quota if plan.monthly_quota else 999999  # Unlimited

    return {
        "status": "active",
        "quota_remaining": quota_remaining,
        "reset_date": subscription.period_reset_date,
        "plan_tier": plan.name,
        "organization_id": organization.id,
        "organization_name": organization.name,
        "api_key_id": api_key_obj.id
    }

# Usage Tracking Endpoint
class UsageBody(BaseModel):
    endpoint: str
    count: int = 1

@router.post("/usage")
def track_usage(body: UsageBody, api_key: str = Depends(get_api_key), db: Session = Depends(get_db)):
    """Track API usage for an organization"""
    # Get organization from API key
    api_key_obj = db.query(ApiKey).filter(ApiKey.key_hash == hash_api_key(api_key)).first()
    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Get organization
    organization = db.query(Organization).get(api_key_obj.org_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get active subscription
    subscription = db.query(Subscription).filter(
        Subscription.org_id == organization.id,
        Subscription.status == "active"
    ).first()

    if not subscription:
        # Create a default subscription if none exists
        subscription = Subscription(
            org_id=organization.id,
            plan_id=1,  # Default plan
            status="active"
        )
        db.add(subscription)
        db.flush()

    # Get plan details for quota information
    plan = subscription.plan
    if not plan:
        raise HTTPException(status_code=500, detail="No plan associated with subscription")

    # For now, we'll just return success since we don't have usage tracking tables yet
    # In a real implementation, you'd track usage in a separate table
    db.commit()

    return {
        "message": f"Usage tracked for {body.endpoint}",
        "count": body.count,
        "organization_id": organization.id,
        "plan_name": plan.name
    }

# CRUD: Subscriptions
class SubBody(BaseModel):
    org_id: int
    plan_id: int
    status: str = "active"
    period_reset_date: str | None = None  # YYYY-MM-DD

@router.get("/subs")
def list_subs(
    db = Depends(get_db), _ = Depends(get_admin),
    org_id: int | None = Query(None), plan_id: int | None = Query(None), status: str | None = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
):
    qry = db.query(Subscription)
    if org_id is not None:
        qry = qry.filter(Subscription.org_id == org_id)
    if plan_id is not None:
        qry = qry.filter(Subscription.plan_id == plan_id)
    if status:
        qry = qry.filter(Subscription.status == status)
    qry = qry.order_by(Subscription.id.desc())
    return paginate(qry, page, page_size)

@router.post("/subs")
def create_sub(body: SubBody, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    sub = Subscription(org_id=body.org_id, plan_id=body.plan_id, status=body.status, period_reset_date=body.period_reset_date)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

@router.put("/subs/{sub_id}")
def update_sub(sub_id: int, body: SubBody, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    sub = db.query(Subscription).get(sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    sub.org_id = body.org_id
    sub.plan_id = body.plan_id
    sub.status = body.status
    sub.period_reset_date = body.period_reset_date
    db.commit()
    db.refresh(sub)
    return sub

@router.delete("/subs/{sub_id}")
def delete_sub(sub_id: int, db = Depends(get_db), admin = Depends(get_admin)):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    sub = db.query(Subscription).get(sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(sub)
    db.commit()
    return {"ok": True}

# Organization Management Endpoints

def generate_password(length=12):
    """Generate a secure random password"""
    # Use only alphanumeric characters to avoid encoding issues
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@router.post("/organizations")
def create_organization(body: CreateOrganizationBody, db = Depends(get_db), admin = Depends(get_admin)):
    """Create a new organization with login credentials"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    # Check if login email already exists
    existing_org = db.query(Organization).filter(Organization.login_email == body.login_email).first()
    if existing_org:
        raise HTTPException(status_code=400, detail="Login email already exists")

    # Find the plan by name to get plan_id
    plan = db.query(Plan).filter(Plan.name == body.plan_tier).first()
    if not plan:
        raise HTTPException(status_code=400, detail=f"Plan '{body.plan_tier}' not found")

    # Generate or use custom password
    if body.generate_password:
        password = generate_password()
    else:
        password = body.custom_password
        if not password or len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Create organization
    org = Organization(
        name=body.name,
        plan_tier=body.plan_tier,
        contact_email=body.contact_email,
        login_email=body.login_email,
        password_hash=hash_password(password),
        can_reset_password=True,
        status="active"
    )
    db.add(org)
    db.flush()  # Get the organization ID

    # Create subscription for the organization
    subscription = Subscription(
        org_id=org.id,
        plan_id=plan.id,
        status="active",
        period_reset_date="2099-12-31"  # Default to far future for now
    )
    db.add(subscription)
    db.commit()
    db.refresh(org)

    return {
        "organization": org,
        "generated_password": password if body.generate_password else None,
        "subscription_created": True,
        "plan_name": plan.name
    }

@router.put("/organizations/{org_id}")
def update_organization(org_id: int, body: UpdateOrganizationBody, db = Depends(get_db), admin = Depends(get_admin)):
    """Update organization details"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Update fields if provided
    if body.name is not None:
        org.name = body.name
    if body.plan_tier is not None:
        org.plan_tier = body.plan_tier
    if body.contact_email is not None:
        org.contact_email = body.contact_email
    if body.status is not None:
        org.status = body.status

    db.commit()
    db.refresh(org)
    return org

@router.post("/organizations/{org_id}/reset-password")
def reset_organization_password(org_id: int, body: ResetPasswordBody, db = Depends(get_db), admin = Depends(get_admin)):
    """Reset organization login password"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Generate or use custom password
    if body.generate_password:
        password = generate_password()
    else:
        password = body.custom_password
        if not password or len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    org.password_hash = hash_password(password)
    db.commit()

    return {
        "message": "Password reset successfully",
        "new_password": password if body.generate_password else "Custom password set"
    }

@router.post("/organizations/{org_id}/suspend")
def suspend_organization(org_id: int, db = Depends(get_db), admin = Depends(get_admin)):
    """Suspend an organization"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.status = "suspended"
    db.commit()

    return {"message": f"Organization '{org.name}' has been suspended"}

@router.post("/organizations/{org_id}/activate")
def activate_organization(org_id: int, db = Depends(get_db), admin = Depends(get_admin)):
    """Activate a suspended organization"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.status = "active"
    db.commit()

    return {"message": f"Organization '{org.name}' has been activated"}

@router.get("/org-details/{org_id}")
def get_org_details_working(org_id: int, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Get organization details - working route"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return org

@router.get("/org-subscription/{org_id}")
def get_org_subscription_working(org_id: int, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Get organization's current subscription and plan details - working route"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    # Get active subscription
    subscription = db.query(Subscription).filter(
        Subscription.org_id == org_id,
        Subscription.status == "active"
    ).first()

    if not subscription:
        return None

    # Get plan details
    plan = db.query(Plan).get(subscription.plan_id)
    if not plan:
        return None

    return {
        "subscription_id": subscription.id,
        "plan_id": plan.id,
        "plan_name": plan.name,
        "monthly_quota": plan.monthly_quota,
        "price": plan.price,
        "description": plan.description,
        "features": plan.features,
        "status": subscription.status,
        "period_reset_date": subscription.period_reset_date
    }

@router.get("/organizations/{org_id}")
def get_organization_details(org_id: int, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Get organization details"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return org

@router.get("/organizations/{org_id}/subscription")
def get_organization_subscription(org_id: int, db = Depends(get_db), admin = Depends(get_admin)):
    """Get organization's current subscription and plan details"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    # Get active subscription
    subscription = db.query(Subscription).filter(
        Subscription.org_id == org_id,
        Subscription.status == "active"
    ).first()

    if not subscription:
        return None

    # Get plan details
    plan = db.query(Plan).get(subscription.plan_id)
    if not plan:
        return None

    return {
        "subscription_id": subscription.id,
        "plan_id": plan.id,
        "plan_name": plan.name,
        "monthly_quota": plan.monthly_quota,
        "price": plan.price,
        "description": plan.description,
        "features": plan.features,
        "status": subscription.status,
        "period_reset_date": subscription.period_reset_date
    }

@router.delete("/organizations/{org_id}")
def delete_organization(org_id: int, db = Depends(get_db), admin = Depends(get_admin)):
    """Delete an organization and all related data"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    org = db.query(Organization).get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Delete related data in correct order to avoid foreign key constraint violations
    # Delete usage logs first (they reference api_keys)
    db.query(UsageLog).filter(UsageLog.org_id == org_id).delete()

    # Delete monthly usage summaries
    db.query(MonthlyUsageSummary).filter(MonthlyUsageSummary.org_id == org_id).delete()

    # Delete user activity records
    db.query(UserActivity).filter(UserActivity.org_id == org_id).delete()

    # Delete related API keys
    db.query(ApiKey).filter(ApiKey.org_id == org_id).delete()

    # Delete related subscriptions
    db.query(Subscription).filter(Subscription.org_id == org_id).delete()

    # Delete organization
    db.delete(org)
    db.commit()

    return {"message": f"Organization '{org.name}' and all related data has been deleted"}

