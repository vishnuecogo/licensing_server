"""Add enhanced organization fields

Revision ID: 0003
Revises: 0002
Create Date: 2025-09-10 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add enhanced organization status columns
    op.add_column('organizations', sa.Column('disabled_at', sa.DateTime(), nullable=True))
    op.add_column('organizations', sa.Column('disabled_reason', sa.String(length=500), nullable=True))
    op.add_column('organizations', sa.Column('last_activity_at', sa.DateTime(), nullable=True))
    op.add_column('organizations', sa.Column('auto_disable_on_quota_exceeded', sa.Boolean(), nullable=True, default=True))
    op.add_column('organizations', sa.Column('quota_warning_sent', sa.Boolean(), nullable=True, default=False))
    op.add_column('organizations', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))

    # Add enhanced API key tracking columns
    op.add_column('api_keys', sa.Column('disabled_at', sa.DateTime(), nullable=True))
    op.add_column('api_keys', sa.Column('disabled_reason', sa.String(length=500), nullable=True))
    op.add_column('api_keys', sa.Column('auto_disabled', sa.Boolean(), nullable=True, default=False))
    op.add_column('api_keys', sa.Column('last_used_at', sa.DateTime(), nullable=True))
    op.add_column('api_keys', sa.Column('total_requests', sa.BigInteger(), nullable=True, default=0))
    op.add_column('api_keys', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))

    # Update existing records to have default values
    op.execute("UPDATE organizations SET auto_disable_on_quota_exceeded = TRUE WHERE auto_disable_on_quota_exceeded IS NULL")
    op.execute("UPDATE organizations SET quota_warning_sent = FALSE WHERE quota_warning_sent IS NULL")
    op.execute("UPDATE api_keys SET auto_disabled = FALSE WHERE auto_disabled IS NULL")
    op.execute("UPDATE api_keys SET total_requests = 0 WHERE total_requests IS NULL")

    # Make the boolean columns non-nullable after setting defaults
    op.alter_column('organizations', 'auto_disable_on_quota_exceeded', nullable=False)
    op.alter_column('organizations', 'quota_warning_sent', nullable=False)
    op.alter_column('api_keys', 'auto_disabled', nullable=False)
    op.alter_column('api_keys', 'total_requests', nullable=False)


def downgrade() -> None:
    # Remove enhanced organization status columns
    op.drop_column('organizations', 'updated_at')
    op.drop_column('organizations', 'quota_warning_sent')
    op.drop_column('organizations', 'auto_disable_on_quota_exceeded')
    op.drop_column('organizations', 'last_activity_at')
    op.drop_column('organizations', 'disabled_reason')
    op.drop_column('organizations', 'disabled_at')

    # Remove enhanced API key tracking columns
    op.drop_column('api_keys', 'updated_at')
    op.drop_column('api_keys', 'total_requests')
    op.drop_column('api_keys', 'last_used_at')
    op.drop_column('api_keys', 'auto_disabled')
    op.drop_column('api_keys', 'disabled_reason')
    op.drop_column('api_keys', 'disabled_at')
