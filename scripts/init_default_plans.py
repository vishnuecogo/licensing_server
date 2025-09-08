#!/usr/bin/env python3
"""
Script to initialize default plans in the licensing server.
This creates the basic free, pro, and enterprise plans.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import Plan
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_default_plans():
    """Create default plans if they don't exist"""
    try:
        with SessionLocal() as db:
            # Check if plans already exist
            existing_plans = db.query(Plan).count()
            if existing_plans > 0:
                logger.info(f"ℹ️  Plans already exist ({existing_plans} plans found)")
                return True
            
            # Create default plans
            plans_to_create = [
                {
                    "name": "free",
                    "monthly_quota": 1000,
                    "price": 0.00,
                    "description": "Free tier with basic features",
                    "features": "1,000 API calls per month, Basic support, Community access"
                },
                {
                    "name": "pro",
                    "monthly_quota": 50000,
                    "price": 29.99,
                    "description": "Professional tier for growing businesses",
                    "features": "50,000 API calls per month, Priority support, Advanced analytics, Custom integrations"
                },
                {
                    "name": "enterprise",
                    "monthly_quota": None,  # Unlimited
                    "price": 199.99,
                    "description": "Enterprise tier with unlimited usage",
                    "features": "Unlimited API calls, 24/7 dedicated support, Custom SLA, On-premise deployment, Advanced security"
                }
            ]
            
            created_count = 0
            for plan_data in plans_to_create:
                plan = Plan(**plan_data)
                db.add(plan)
                created_count += 1
                logger.info(f"✅ Created plan: {plan_data['name']} (${plan_data['price']}/month)")
            
            db.commit()
            logger.info(f"🎉 Successfully created {created_count} default plans!")
            return True
            
    except Exception as e:
        logger.error(f"❌ Error creating default plans: {e}")
        return False

def main():
    """Main function"""
    logger.info("🚀 Starting default plans initialization...")
    
    success = create_default_plans()
    
    if success:
        logger.info("✅ Default plans initialization completed successfully!")
        sys.exit(0)
    else:
        logger.error("❌ Default plans initialization failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
