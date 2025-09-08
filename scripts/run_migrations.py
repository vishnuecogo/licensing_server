#!/usr/bin/env python3
"""
Migration runner script that seeds admin users after running Alembic migrations.
This script is called from the Docker entrypoint after Alembic migrations complete.
"""

import os
import sys
import logging
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.database import SessionLocal
from app.db.admin_models import AdminUser
from app.db.models import Organization
import bcrypt

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_admin_user():
    """Create default admin user if it doesn't exist."""
    try:
        logger.info("Checking for admin user...")
        
        with SessionLocal() as db:
            # Check if admin user exists
            admin_user = db.query(AdminUser).filter(
                AdminUser.email == 'admin@eva.local'
            ).first()
            
            if not admin_user:
                # Create admin user
                password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                admin_user = AdminUser(
                    email='admin@eva.local',
                    password_hash=password_hash,
                    role='admin',
                    active=True
                )
                db.add(admin_user)
                db.commit()
                logger.info("✅ Created admin user: admin@eva.local / admin123")
            else:
                logger.info("ℹ️  Admin user already exists")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating admin user: {e}")
        return False

def create_admin_organization():
    """Create admin organization if it doesn't exist."""
    try:
        logger.info("Checking for admin organization...")
        
        with SessionLocal() as db:
            # Check if admin organization exists
            admin_org = db.query(Organization).filter(
                Organization.login_email == 'admin@eva.local'
            ).first()
            
            if not admin_org:
                # Create admin organization
                password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                admin_org = Organization(
                    name='Admin Organization',
                    plan_tier='enterprise',
                    contact_email='admin@eva.local',
                    login_email='admin@eva.local',
                    password_hash=password_hash,
                    status='active'
                )
                db.add(admin_org)
                db.commit()
                logger.info("✅ Created admin organization: admin@eva.local / admin123")
            else:
                logger.info("ℹ️  Admin organization already exists")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating admin organization: {e}")
        return False

def main():
    """Main function."""
    logger.info("🚀 Starting post-migration seeding...")
    
    success = True
    
    # Create admin user
    if not create_admin_user():
        success = False
    
    # Create admin organization
    if not create_admin_organization():
        success = False
    
    if success:
        logger.info("✅ Post-migration seeding completed successfully!")
        print("\n" + "="*60)
        print("🎉 ADMIN USERS CREATED!")
        print("="*60)
        print("Admin Dashboard: http://localhost:3333")
        print("  Email: admin@eva.local")
        print("  Password: admin123")
        print("="*60)
    else:
        logger.error("❌ Post-migration seeding failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
