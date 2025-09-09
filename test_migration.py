#!/usr/bin/env python3
"""
Test script to verify that the token usage analytics migration works correctly.
This script can be run after starting the licensing server to verify the database schema.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_database_url():
    """Get database URL from environment variables"""
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'licensing')
    db_user = os.getenv('DB_USER', 'evadb')
    db_password = os.getenv('DB_PASSWORD', 'evadbpass')
    
    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

def test_migration():
    """Test that the migration was applied correctly"""
    try:
        database_url = get_database_url()
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Check if the new columns exist
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'monthly_usage_summary' 
                AND column_name IN (
                    'gpt_vision_tokens', 'text_embedding_tokens', 'chat_completion_tokens',
                    'deepseek_cost', 'openai_cost', 'gpt_vision_cost', 'embedding_cost',
                    'files_processed', 'vision_analyses'
                )
                ORDER BY column_name;
            """))
            
            columns = [row[0] for row in result.fetchall()]
            expected_columns = [
                'chat_completion_tokens', 'deepseek_cost', 'embedding_cost', 
                'files_processed', 'gpt_vision_cost', 'gpt_vision_tokens', 
                'openai_cost', 'text_embedding_tokens', 'vision_analyses'
            ]
            
            print("🔍 Checking migration results...")
            print(f"Found columns: {columns}")
            print(f"Expected columns: {expected_columns}")
            
            missing_columns = set(expected_columns) - set(columns)
            if missing_columns:
                print(f"❌ Missing columns: {missing_columns}")
                return False
            else:
                print("✅ All expected columns are present!")
                
                # Test that we can query the table
                test_query = connection.execute(text("""
                    SELECT COUNT(*) as count,
                           SUM(COALESCE(gpt_vision_tokens, 0)) as total_vision_tokens,
                           SUM(COALESCE(deepseek_cost, 0)) as total_deepseek_cost
                    FROM monthly_usage_summary;
                """))
                
                result = test_query.fetchone()
                print(f"✅ Query test successful: {result.count} records, {result.total_vision_tokens} vision tokens, ${result.total_deepseek_cost} deepseek cost")
                return True
                
    except Exception as e:
        print(f"❌ Migration test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing token usage analytics migration...")
    success = test_migration()
    if success:
        print("🎉 Migration test passed!")
        sys.exit(0)
    else:
        print("💥 Migration test failed!")
        sys.exit(1)
