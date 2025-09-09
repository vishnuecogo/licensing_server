"""Add token usage analytics and model-specific tracking

Revision ID: 0002
Revises: 0001
Create Date: 2025-09-09 11:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add model-specific token tracking columns to monthly_usage_summary (with IF NOT EXISTS)
    op.execute('ALTER TABLE monthly_usage_summary ADD COLUMN IF NOT EXISTS gpt_vision_tokens BIGINT DEFAULT 0')
    op.execute('ALTER TABLE monthly_usage_summary ADD COLUMN IF NOT EXISTS text_embedding_tokens BIGINT DEFAULT 0')
    op.execute('ALTER TABLE monthly_usage_summary ADD COLUMN IF NOT EXISTS chat_completion_tokens BIGINT DEFAULT 0')

    # Add cost tracking columns (with IF NOT EXISTS)
    op.execute('ALTER TABLE monthly_usage_summary ADD COLUMN IF NOT EXISTS deepseek_cost NUMERIC(10,4) DEFAULT 0')
    op.execute('ALTER TABLE monthly_usage_summary ADD COLUMN IF NOT EXISTS openai_cost NUMERIC(10,4) DEFAULT 0')
    op.execute('ALTER TABLE monthly_usage_summary ADD COLUMN IF NOT EXISTS gpt_vision_cost NUMERIC(10,4) DEFAULT 0')
    op.execute('ALTER TABLE monthly_usage_summary ADD COLUMN IF NOT EXISTS embedding_cost NUMERIC(10,4) DEFAULT 0')

    # Add feature usage columns (with IF NOT EXISTS)
    op.execute('ALTER TABLE monthly_usage_summary ADD COLUMN IF NOT EXISTS files_processed BIGINT DEFAULT 0')
    op.execute('ALTER TABLE monthly_usage_summary ADD COLUMN IF NOT EXISTS vision_analyses BIGINT DEFAULT 0')


def downgrade() -> None:
    # Remove the added columns (with IF EXISTS)
    op.execute('ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS vision_analyses')
    op.execute('ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS files_processed')
    op.execute('ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS embedding_cost')
    op.execute('ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS gpt_vision_cost')
    op.execute('ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS openai_cost')
    op.execute('ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS deepseek_cost')
    op.execute('ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS chat_completion_tokens')
    op.execute('ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS text_embedding_tokens')
    op.execute('ALTER TABLE monthly_usage_summary DROP COLUMN IF EXISTS gpt_vision_tokens')
