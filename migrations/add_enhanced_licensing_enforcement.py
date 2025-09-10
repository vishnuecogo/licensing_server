"""
Enhanced Licensing Enforcement Migration
Adds organization status management and API key auto-disabling functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.database import SessionLocal

def run_migration():
    """Add enhanced licensing enforcement columns"""
    db = SessionLocal()
    try:
        print("🔄 Running enhanced licensing enforcement migration...")
        
        # Add new columns to organizations table
        print("📊 Adding enhanced organization status columns...")
        db.execute(text("""
            ALTER TABLE organizations 
            ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS disabled_reason VARCHAR(500) NULL,
            ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS auto_disable_on_quota_exceeded BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS quota_warning_sent BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
        """))
        
        # Update status column to support new values
        print("🔄 Updating organization status enum...")
        db.execute(text("""
            UPDATE organizations 
            SET status = 'active' 
            WHERE status NOT IN ('active', 'disabled', 'suspended', 'blocked');
        """))
        
        # Add new columns to api_keys table
        print("🔑 Adding enhanced API key tracking columns...")
        db.execute(text("""
            ALTER TABLE api_keys 
            ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS disabled_reason VARCHAR(500) NULL,
            ADD COLUMN IF NOT EXISTS auto_disabled BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS total_requests BIGINT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
        """))
        
        # Create indexes for performance
        print("📈 Creating performance indexes...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
            CREATE INDEX IF NOT EXISTS idx_organizations_last_activity ON organizations(last_activity_at);
            CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
            CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at);
            CREATE INDEX IF NOT EXISTS idx_api_keys_org_active ON api_keys(org_id, active);
        """))
        
        # Update existing organizations to have last_activity_at
        print("🕒 Setting initial last_activity_at for existing organizations...")
        db.execute(text("""
            UPDATE organizations 
            SET last_activity_at = created_at 
            WHERE last_activity_at IS NULL;
        """))
        
        # Update existing API keys to have last_used_at
        print("🔑 Setting initial last_used_at for existing API keys...")
        db.execute(text("""
            UPDATE api_keys 
            SET last_used_at = created_at 
            WHERE last_used_at IS NULL AND active = TRUE;
        """))
        
        db.commit()
        print("✅ Enhanced licensing enforcement migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
