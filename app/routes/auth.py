from fastapi import APIRouter, Depends, HTTPException
from fastapi import Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import SessionLocal
from app.services.auth_service import verify_license
from app.services.unified_auth import authenticate_user
from app.utils.admin_security import decode_token
from app.db.models import Organization, Subscription
from app.db.models import ApiKey

router = APIRouter()

class LoginBody(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str
    user_data: dict

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/verify")
def verify(
    auth_header: str = Header(None, alias="Authorization"),
    check_only: bool = False,
    db: Session = Depends(get_db)
):
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token_or_key = auth_header.split(" ", 1)[1]

    # 1) Try to treat as JWT session token first (organization/admin UI login)
    try:
        payload = decode_token(token_or_key)  # raises on invalid token
        if isinstance(payload, dict) and payload.get("sub") and payload.get("role"):
            role = payload.get("role")
            subject = payload.get("sub")

            # Organization session token
            if role == "organization":
                org = db.query(Organization).filter(Organization.login_email == subject).first()
                if not org or org.status != "active":
                    # Include API key presence if org exists
                    api_keys_count = 0
                    if org:
                        api_keys_count = db.query(ApiKey).filter(ApiKey.org_id == org.id).count()
                    result = {"status": "blocked", "quota_remaining": 0, "reset_date": None, "plan_tier": org.plan_tier if org else None, "organization_id": org.id if org else None, "organization_name": org.name if org else None, "api_key_id": None, "needs_api_key": api_keys_count == 0, "api_keys_count": api_keys_count}
                    # Map None to -1 for unlimited semantics
                    if result.get("quota_remaining") is None:
                        result["quota_remaining"] = -1
                    return result

                # Active org: check active subscription and compute quota
                sub = (
                    db.query(Subscription)
                    .filter(Subscription.org_id == org.id, Subscription.status.in_(["active"]))
                    .first()
                )
                # Count API keys once
                api_keys_count = db.query(ApiKey).filter(ApiKey.org_id == org.id).count()

                if not sub:
                    result = {"status": "expired", "quota_remaining": 0, "reset_date": None, "plan_tier": org.plan_tier, "organization_id": org.id, "organization_name": org.name, "api_key_id": None, "needs_api_key": api_keys_count == 0, "api_keys_count": api_keys_count}
                    return result

                plan = sub.plan  # relationship
                monthly_quota = plan.monthly_quota  # None => unlimited
                quota_remaining = monthly_quota if monthly_quota is not None else None
                reset_date = sub.period_reset_date

                result = {
                    "status": "active",
                    "quota_remaining": quota_remaining,
                    "reset_date": reset_date,
                    "plan_tier": org.plan_tier,
                    "organization_id": org.id,
                    "organization_name": org.name,
                    "api_key_id": None,
                    "needs_api_key": api_keys_count == 0,
                    "api_keys_count": api_keys_count,
                }
                if result.get("quota_remaining") is None:
                    result["quota_remaining"] = -1
                return result

            # Admin session token: mark as active with unlimited quota
            if role == "admin" or role == "viewer":
                return {
                    "status": "active",
                    "quota_remaining": -1,  # unlimited for admin UI
                    "reset_date": None,
                    "plan_tier": None,
                    "organization_id": None,
                    "organization_name": None,
                    "api_key_id": None,
                }
            # Unknown role: treat as blocked
            return {"status": "blocked", "quota_remaining": 0, "reset_date": None, "plan_tier": None, "organization_id": None, "organization_name": None, "api_key_id": None}
    except Exception:
        # Not a valid JWT; fall through to API key verification
        pass

    # 2) Fallback: treat as API key (backend usage / server-to-server)
    api_key_row, payload = verify_license(db, token_or_key, increment_usage=not check_only)

    # Map None to -1 for unlimited if you prefer clients to treat -1 as unlimited
    quota = payload.get("quota_remaining")
    if quota is None:
        payload["quota_remaining"] = -1

    return payload


@router.post("/login", response_model=TokenResponse)
def auth_login(body: LoginBody, db = Depends(get_db)):
    """
    Authentication login endpoint for client applications.
    This is a compatibility endpoint that redirects to the unified login.
    Prioritizes organization authentication for organization-specific clients.
    """
    # Check if this is likely an organization login by checking if organization exists
    from app.db.models import Organization
    org_exists = db.query(Organization).filter(
        Organization.login_email == body.email,
        Organization.status == "active"
    ).first() is not None

    # If organization exists with this email, prefer organization authentication
    auth_result = authenticate_user(db, body.email, body.password, prefer_organization=org_exists)

    if not auth_result.success:
        raise HTTPException(status_code=401, detail=auth_result.error)

    # Additional check: if this is a WhatsApp API request, ensure it's an organization
    # This can be determined by checking the user agent or a custom header
    if auth_result.user_type == "admin" and org_exists:
        # If admin was authenticated but organization exists, this might be a mistake
        # Let's try organization authentication explicitly
        auth_result = authenticate_user(db, body.email, body.password, prefer_organization=True)
        if not auth_result.success:
            raise HTTPException(status_code=401, detail="Authentication failed")

    # Enrich user_data with API key presence for organization accounts
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


@router.post("/org/login", response_model=TokenResponse)
def org_login(body: LoginBody, db = Depends(get_db)):
    """
    Organization-specific login endpoint.
    This endpoint prioritizes organization authentication and only allows organization logins.
    """
    # Force organization authentication
    auth_result = authenticate_user(db, body.email, body.password, prefer_organization=True)

    if not auth_result.success:
        raise HTTPException(status_code=401, detail="Authentication failed")

    # Only allow organization accounts
    if auth_result.user_type != "organization":
        raise HTTPException(status_code=401, detail="Only organization accounts are allowed to access WA API")

    # Enrich user_data with API key presence for organization accounts
    user_data = dict(auth_result.user_data or {})
    if user_data.get("id") is not None:
        api_keys_count = db.query(ApiKey).filter(ApiKey.org_id == user_data["id"]).count()
        user_data["api_keys_count"] = api_keys_count
        user_data["needs_api_key"] = api_keys_count == 0

    return TokenResponse(
        access_token=auth_result.token,
        user_type=auth_result.user_type,
        user_data=user_data
    )

