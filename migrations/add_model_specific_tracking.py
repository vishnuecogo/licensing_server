"""
Migration script to add model-specific token tracking columns to the database.
This migration adds new columns to the monthly_usage_summary table to track
different model types separately (GPT Vision, embeddings, chat models).
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_database_url():
    """Get database URL from environment variables"""
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'licensing_db')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'password')
    
    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

def run_migration():
    """Run the migration to add model-specific tracking columns"""
    database_url = get_database_url()
    engine = create_engine(database_url)
    
    # SQL statements to add new columns
    migration_sql = [
        # Add model-specific token tracking columns
        """
        ALTER TABLE monthly_usage_summary 
        ADD COLUMN IF NOT EXISTS gpt_vision_tokens BIGINT DEFAULT 0;
        """,
        """
        ALTER TABLE monthly_usage_summary 
        ADD COLUMN IF NOT EXISTS text_embedding_tokens BIGINT DEFAULT 0;
        """,
        """
        ALTER TABLE monthly_usage_summary 
        ADD COLUMN IF NOT EXISTS chat_completion_tokens BIGINT DEFAULT 0;
        """,
        
        # Add cost tracking columns
        """
        ALTER TABLE monthly_usage_summary 
        ADD COLUMN IF NOT EXISTS deepseek_cost NUMERIC(10,4) DEFAULT 0;
        """,
        """
        ALTER TABLE monthly_usage_summary 
        ADD COLUMN IF NOT EXISTS openai_cost NUMERIC(10,4) DEFAULT 0;
        """,
        """
        ALTER TABLE monthly_usage_summary 
        ADD COLUMN IF NOT EXISTS gpt_vision_cost NUMERIC(10,4) DEFAULT 0;
        """,
        """
        ALTER TABLE monthly_usage_summary 
        ADD COLUMN IF NOT EXISTS embedding_cost NUMERIC(10,4) DEFAULT 0;
        """,
        
        # Add feature usage columns
        """
        ALTER TABLE monthly_usage_summary 
        ADD COLUMN IF NOT EXISTS files_processed BIGINT DEFAULT 0;
        """,
        """
        ALTER TABLE monthly_usage_summary 
        ADD COLUMN IF NOT EXISTS vision_analyses BIGINT DEFAULT 0;
        """,
        
        # Update existing records to have default values
        """
        UPDATE monthly_usage_summary 
        SET gpt_vision_tokens = 0 
        WHERE gpt_vision_tokens IS NULL;
        """,
        """
        UPDATE monthly_usage_summary 
        SET text_embedding_tokens = 0 
        WHERE text_embedding_tokens IS NULL;
        """,
        """
        UPDATE monthly_usage_summary 
        SET chat_completion_tokens = 0 
        WHERE chat_completion_tokens IS NULL;
        """,
        """
        UPDATE monthly_usage_summary 
        SET deepseek_cost = 0 
        WHERE deepseek_cost IS NULL;
        """,
        """
        UPDATE monthly_usage_summary 
        SET openai_cost = 0 
        WHERE openai_cost IS NULL;
        """,
        """
        UPDATE monthly_usage_summary 
        SET gpt_vision_cost = 0 
        WHERE gpt_vision_cost IS NULL;
        """,
        """
        UPDATE monthly_usage_summary 
        SET embedding_cost = 0 
        WHERE embedding_cost IS NULL;
        """,
        """
        UPDATE monthly_usage_summary 
        SET files_processed = 0 
        WHERE files_processed IS NULL;
        """,
        """
        UPDATE monthly_usage_summary 
        SET vision_analyses = 0 
        WHERE vision_analyses IS NULL;
        """,
    ]
    
    try:
        with engine.connect() as connection:
            # Start a transaction
            trans = connection.begin()
            
            try:
                for sql in migration_sql:
                    print(f"Executing: {sql.strip()}")
                    connection.execute(text(sql))
                
                # Commit the transaction
                trans.commit()
                print("✅ Migration completed successfully!")
                
            except Exception as e:
                # Rollback on error
                trans.rollback()
                print(f"❌ Migration failed: {e}")
                raise
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise

def rollback_migration():
    """Rollback the migration by removing the added columns"""
    database_url = get_database_url()
    engine = create_engine(database_url)
    
    rollback_sql = [
        "ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS gpt_vision_tokens;",
        "ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS text_embedding_tokens;",
        "ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS chat_completion_tokens;",
        "ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS deepseek_cost;",
        "ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS openai_cost;",
        "ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS gpt_vision_cost;",
        "ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS embedding_cost;",
        "ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS files_processed;",
        "ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS vision_analyses;",
    ]
    
    try:
        with engine.connect() as connection:
            trans = connection.begin()
            
            try:
                for sql in rollback_sql:
                    print(f"Executing rollback: {sql}")
                    connection.execute(text(sql))
                
                trans.commit()
                print("✅ Rollback completed successfully!")
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Rollback failed: {e}")
                raise
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        print("🔄 Rolling back migration...")
        rollback_migration()
    else:
        print("🚀 Running migration...")
        run_migration()
