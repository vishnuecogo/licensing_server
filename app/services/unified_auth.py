from typing import Optional, Dict, Union
from sqlalchemy.orm import Session

from app.db.admin_models import AdminUser
from app.db.models import Organization
from app.utils.admin_security import verify_password, create_access_token


class AuthResult:
    def __init__(self, success: bool, user_type: str = None, user_data: Dict = None, token: str = None, error: str = None):
        self.success = success
        self.user_type = user_type  # "admin" or "organization"
        self.user_data = user_data
        self.token = token
        self.error = error


def authenticate_user(db: Session, email: str, password: str, prefer_organization: bool = False) -> AuthResult:
    """
    Unified authentication that checks both admin users and organizations.
    Returns AuthResult with user type and appropriate token.

    Args:
        db: Database session
        email: User email
        password: User password
        prefer_organization: If True, check organization first (for organization-specific endpoints)
    """

    if prefer_organization:
        # For organization-specific endpoints, check organization first
        organization = db.query(Organization).filter(
            Organization.login_email == email,
            Organization.status == "active"
        ).first()

        if organization and organization.password_hash and verify_password(password, organization.password_hash):
            # Organization authenticated
            token = create_access_token(
                subject=organization.login_email,
                role="organization"
            )

            return AuthResult(
                success=True,
                user_type="organization",
                user_data={
                    "id": organization.id,
                    "email": organization.login_email,
                    "name": organization.name,
                    "plan_tier": organization.plan_tier,
                    "contact_email": organization.contact_email,
                    "can_reset_password": organization.can_reset_password
                },
                token=token
            )

        # If organization auth failed, try admin
        admin_user = db.query(AdminUser).filter(
            AdminUser.email == email,
            AdminUser.active == True
        ).first()

        if admin_user and verify_password(password, admin_user.password_hash):
            # Admin user authenticated
            token = create_access_token(
                subject=admin_user.email,
                role=admin_user.role
            )

            return AuthResult(
                success=True,
                user_type="admin",
                user_data={
                    "id": admin_user.id,
                    "email": admin_user.email,
                    "role": admin_user.role,
                    "name": "Admin User"
                },
                token=token
            )
    else:
        # Default behavior: check admin first, then organization
        admin_user = db.query(AdminUser).filter(
            AdminUser.email == email,
            AdminUser.active == True
        ).first()

        if admin_user and verify_password(password, admin_user.password_hash):
            # Admin user authenticated
            token = create_access_token(
                subject=admin_user.email,
                role=admin_user.role
            )

            return AuthResult(
                success=True,
                user_type="admin",
                user_data={
                    "id": admin_user.id,
                    "email": admin_user.email,
                    "role": admin_user.role,
                    "name": "Admin User"
                },
                token=token
            )

        # If not admin, try to authenticate as organization
        organization = db.query(Organization).filter(
            Organization.login_email == email,
            Organization.status == "active"
        ).first()

        if organization and organization.password_hash and verify_password(password, organization.password_hash):
            # Organization authenticated
            token = create_access_token(
                subject=organization.login_email,
                role="organization"
            )

            return AuthResult(
                success=True,
                user_type="organization",
                user_data={
                    "id": organization.id,
                    "email": organization.login_email,
                    "name": organization.name,
                    "plan_tier": organization.plan_tier,
                    "contact_email": organization.contact_email,
                    "can_reset_password": organization.can_reset_password
                },
                token=token
            )

    # Authentication failed
    return AuthResult(
        success=False,
        error="Invalid email or password"
    )


def get_user_from_token(db: Session, token: str) -> Optional[Dict]:
    """
    Get user information from JWT token.
    Returns user data with type information.
    """
    from app.utils.admin_security import decode_token
    
    try:
        payload = decode_token(token)
        if not payload:
            return None
            
        email = payload.get("sub")
        role = payload.get("role")
        
        if role == "admin":
            admin_user = db.query(AdminUser).filter(
                AdminUser.email == email,
                AdminUser.active == True
            ).first()
            
            if admin_user:
                return {
                    "user_type": "admin",
                    "id": admin_user.id,
                    "email": admin_user.email,
                    "role": admin_user.role,
                    "name": "Admin User"
                }
        
        elif role == "organization":
            organization = db.query(Organization).filter(
                Organization.login_email == email,
                Organization.status == "active"
            ).first()
            
            if organization:
                return {
                    "user_type": "organization",
                    "id": organization.id,
                    "email": organization.login_email,
                    "name": organization.name,
                    "plan_tier": organization.plan_tier,
                    "contact_email": organization.contact_email
                }
        
        return None
        
    except Exception:
        return None
