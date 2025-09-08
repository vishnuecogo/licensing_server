"""Initial schema

Revision ID: 0001
Revises: 
Create Date: 2024-08-22 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create organizations table
    op.create_table('organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('plan_tier', sa.String(length=50), nullable=True),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('login_email', sa.String(length=255), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('can_reset_password', sa.Boolean(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('login_email')
    )

    # Create plans table
    op.create_table('plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('monthly_quota', sa.BigInteger(), nullable=True),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('features', sa.String(length=1000), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Create api_keys table
    op.create_table('api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('key_hash', sa.String(length=64), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_hash')
    )

    # Create subscriptions table
    op.create_table('subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('period_reset_date', sa.String(length=10), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create usage_logs table
    op.create_table('usage_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('api_key_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('llm_provider', sa.String(length=50), nullable=True),
        sa.Column('llm_model', sa.String(length=100), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('total_tokens', sa.Integer(), nullable=True),
        sa.Column('estimated_cost', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('request_type', sa.String(length=50), nullable=True),
        sa.Column('endpoint', sa.String(length=200), nullable=True),
        sa.Column('user_jid', sa.String(length=100), nullable=True),
        sa.Column('message_id', sa.String(length=100), nullable=True),
        sa.Column('conversation_id', sa.String(length=100), nullable=True),
        sa.Column('intent_type', sa.String(length=50), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['api_key_id'], ['api_keys.id'], ),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create monthly_usage_summary table
    op.create_table('monthly_usage_summary',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('year_month', sa.String(length=7), nullable=False),
        sa.Column('total_deepseek_tokens', sa.BigInteger(), nullable=True),
        sa.Column('total_openai_tokens', sa.BigInteger(), nullable=True),
        sa.Column('total_cost', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('incoming_messages', sa.BigInteger(), nullable=True),
        sa.Column('bot_responses', sa.BigInteger(), nullable=True),
        sa.Column('unique_users', sa.Integer(), nullable=True),
        sa.Column('intent_analyses', sa.BigInteger(), nullable=True),
        sa.Column('rag_queries', sa.BigInteger(), nullable=True),
        sa.Column('style_analyses', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'year_month')
    )

    # Create user_activity table
    op.create_table('user_activity',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('user_jid', sa.String(length=100), nullable=False),
        sa.Column('year_month', sa.String(length=7), nullable=False),
        sa.Column('message_count', sa.Integer(), nullable=True),
        sa.Column('first_message_at', sa.DateTime(), nullable=True),
        sa.Column('last_message_at', sa.DateTime(), nullable=True),
        sa.Column('total_tokens_used', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'user_jid', 'year_month')
    )

    # Create admin_users table
    op.create_table('admin_users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # Insert default plans
    op.execute("""
        INSERT INTO plans (name, monthly_quota, price, description, features) VALUES
        ('free', 1000, 0, 'Free plan with basic features', '["basic_api", "1000_requests"]'),
        ('pro', 10000, 29.99, 'Pro plan with advanced features', '["advanced_api", "10000_requests", "priority_support"]'),
        ('enterprise', NULL, 99.99, 'Enterprise plan with unlimited requests', '["unlimited_requests", "custom_features", "dedicated_support"]')
        ON CONFLICT (name) DO NOTHING
    """)

    # Note: Admin user is seeded via scripts/run_migrations.py


def downgrade() -> None:
    op.drop_table('user_activity')
    op.drop_table('monthly_usage_summary')
    op.drop_table('usage_logs')
    op.drop_table('subscriptions')
    op.drop_table('api_keys')
    op.drop_table('admin_users')
    op.drop_table('plans')
    op.drop_table('organizations')
