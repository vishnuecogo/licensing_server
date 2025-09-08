#!/usr/bin/env python3
"""
Script to fix NULL values in monthly_usage_summary table
"""
import os
import sys
sys.path.append('/app')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.models import MonthlyUsageSummary
from app.db.database import SessionLocal

def fix_null_values():
    """Fix NULL values in monthly_usage_summary table"""
    db = SessionLocal()
    try:
        # Update all NULL values to 0
        update_query = text("""
            UPDATE monthly_usage_summary 
            SET 
                total_deepseek_tokens = COALESCE(total_deepseek_tokens, 0),
                total_openai_tokens = COALESCE(total_openai_tokens, 0),
                total_cost = COALESCE(total_cost, 0),
                incoming_messages = COALESCE(incoming_messages, 0),
                bot_responses = COALESCE(bot_responses, 0),
                unique_users = COALESCE(unique_users, 0),
                intent_analyses = COALESCE(intent_analyses, 0),
                rag_queries = COALESCE(rag_queries, 0),
                style_analyses = COALESCE(style_analyses, 0)
            WHERE 
                total_deepseek_tokens IS NULL OR
                total_openai_tokens IS NULL OR
                total_cost IS NULL OR
                incoming_messages IS NULL OR
                bot_responses IS NULL OR
                unique_users IS NULL OR
                intent_analyses IS NULL OR
                rag_queries IS NULL OR
                style_analyses IS NULL
        """)
        
        result = db.execute(update_query)
        db.commit()
        print(f"Updated {result.rowcount} records with NULL values")
        
        # Check current records
        records = db.query(MonthlyUsageSummary).all()
        print(f"Total records in monthly_usage_summary: {len(records)}")
        for record in records:
            print(f"Org {record.org_id}, Month {record.year_month}: "
                  f"OpenAI={record.total_openai_tokens}, DeepSeek={record.total_deepseek_tokens}, "
                  f"Cost={record.total_cost}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_null_values()
