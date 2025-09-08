#!/usr/bin/env python3
"""
Script to fix organizations that don't have active subscriptions.
This creates subscriptions for organizations based on their plan_tier.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import Organization, Plan, Subscription
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_missing_subscriptions():
    """Fix organizations that don't have active subscriptions"""
    try:
        with SessionLocal() as db:
            # Find organizations without active subscriptions
            orgs_without_subs = db.query(Organization).filter(
                ~Organization.id.in_(
                    db.query(Subscription.org_id).filter(
                        Subscription.status == "active"
                    )
                )
            ).all()
            
            if not orgs_without_subs:
                logger.info("✅ All organizations have active subscriptions")
                return True
            
            logger.info(f"🔧 Found {len(orgs_without_subs)} organizations without active subscriptions")
            
            fixed_count = 0
            for org in orgs_without_subs:
                # Find the plan for this organization
                plan = db.query(Plan).filter(Plan.name == org.plan_tier).first()
                
                if not plan:
                    logger.warning(f"⚠️  Plan '{org.plan_tier}' not found for organization '{org.name}'. Skipping.")
                    continue
                
                # Create subscription
                subscription = Subscription(
                    org_id=org.id,
                    plan_id=plan.id,
                    status="active",
                    period_reset_date="2099-12-31"
                )
                db.add(subscription)
                fixed_count += 1
                logger.info(f"✅ Created subscription for '{org.name}' with plan '{plan.name}'")
            
            if fixed_count > 0:
                db.commit()
                logger.info(f"🎉 Fixed {fixed_count} organizations")
            else:
                logger.info("ℹ️  No organizations needed fixing")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error fixing subscriptions: {e}")
        return False

def main():
    """Main function"""
    logger.info("🚀 Starting subscription fix script...")
    
    success = fix_missing_subscriptions()
    
    if success:
        logger.info("✅ Subscription fix completed successfully!")
        sys.exit(0)
    else:
        logger.error("❌ Subscription fix failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
