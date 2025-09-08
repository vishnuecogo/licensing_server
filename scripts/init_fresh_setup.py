#!/usr/bin/env python3
"""
Fresh setup initialization script for the Licensing Server.
This script creates a demo organization and API key for testing purposes.
"""

import os
import sys
import logging
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.database import SessionLocal
from app.db.models import Organization, ApiKey, Subscription, Plan
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_demo_organization():
    """Create demo organization and API key for testing."""
    try:
        logger.info("Creating demo organization and API key...")
        
        with SessionLocal() as db:
            # Check if demo organization exists
            demo_org = db.query(Organization).filter(
                Organization.login_email == 'demo@eva.local'
            ).first()
            
            if not demo_org:
                # Create demo organization
                demo_org = Organization(
                    name='Demo Organization',
                    plan_tier='pro',
                    contact_email='demo@eva.local',
                    login_email='demo@eva.local',
                    password_hash='$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXzgVrqUm/pG',  # admin123
                    status='active'
                )
                db.add(demo_org)
                db.commit()
                db.refresh(demo_org)
                logger.info("✅ Created demo organization: demo@eva.local / admin123")
            else:
                logger.info("ℹ️  Demo organization already exists")
            
            # Check if demo API key exists
            demo_key_hash = hashlib.sha256('evakey_demo_123'.encode()).hexdigest()
            existing_key = db.query(ApiKey).filter(
                ApiKey.key_hash == demo_key_hash
            ).first()
            
            if not existing_key:
                # Create demo API key
                demo_key = ApiKey(
                    org_id=demo_org.id,
                    key_hash=demo_key_hash,
                    active=True
                )
                db.add(demo_key)
                db.commit()
                logger.info("✅ Created demo API key: evakey_demo_123")
            else:
                logger.info("ℹ️  Demo API key already exists")
            
            # Check if subscription exists
            existing_subscription = db.query(Subscription).filter(
                Subscription.org_id == demo_org.id
            ).first()
            
            if not existing_subscription:
                # Get pro plan
                pro_plan = db.query(Plan).filter(Plan.name == 'pro').first()
                if pro_plan:
                    subscription = Subscription(
                        org_id=demo_org.id,
                        plan_id=pro_plan.id,
                        status='active',
                        period_reset_date='2099-12-31'
                    )
                    db.add(subscription)
                    db.commit()
                    logger.info("✅ Created demo subscription")
                else:
                    logger.warning("⚠️  Pro plan not found, skipping subscription creation")
            else:
                logger.info("ℹ️  Demo subscription already exists")
        
        logger.info("🎉 Demo organization setup completed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating demo organization: {e}")
        return False

def main():
    """Main function."""
    logger.info("🚀 Starting fresh setup initialization...")
    
    if create_demo_organization():
        logger.info("✅ Fresh setup initialization completed successfully!")
        print("\n" + "="*60)
        print("🎉 SETUP COMPLETE!")
        print("="*60)
        print("Admin Dashboard: http://localhost:3333")
        print("  Email: admin@eva.local")
        print("  Password: admin123")
        print("")
        print("Demo Organization:")
        print("  Email: demo@eva.local")
        print("  Password: admin123")
        print("  API Key: evakey_demo_123")
        print("="*60)
    else:
        logger.error("❌ Fresh setup initialization failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
