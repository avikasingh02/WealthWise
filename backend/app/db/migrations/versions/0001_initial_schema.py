"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("role", sa.String(16), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.Text, nullable=False),
        sa.Column("jti", sa.String(64), unique=True, nullable=False),
        sa.Column("revoked", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"])

    op.create_table(
        "audit_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(48), nullable=False),
        sa.Column("meta", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "accounts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nickname", sa.String(80), nullable=False),
        sa.Column("bank_name", sa.String(80), nullable=True),
        sa.Column("account_hint", sa.String(8), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
    )

    op.create_table(
        "categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(40), unique=True, nullable=False),
        sa.Column("icon", sa.String(40), nullable=True),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="true"),
    )

    op.create_table(
        "category_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pattern", sa.String(120), nullable=False),
        sa.Column("priority", sa.Integer, nullable=False, server_default="100"),
    )

    op.create_table(
        "upload_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False),
        sa.Column("storage_key", sa.Text, nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="PENDING"),
        sa.Column("rows_inserted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "file_hash", name="uq_upload_jobs_user_file"),
    )

    op.create_table(
        "transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("upload_job_id", UUID(as_uuid=True), sa.ForeignKey("upload_jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("txn_date", sa.Date, nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("direction", sa.String(6), nullable=False),
        sa.Column("merchant_raw", sa.Text, nullable=True),
        sa.Column("merchant_norm", sa.Text, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("txn_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "txn_hash", name="uq_transactions_user_hash"),
    )
    op.create_index("ix_transactions_user_date", "transactions", ["user_id", "txn_date"])
    op.create_index("ix_transactions_user_category_date", "transactions", ["user_id", "category_id", "txn_date"])

    op.create_table(
        "budgets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("monthly_limit", sa.Numeric(14, 2), nullable=False),
        sa.Column("period", sa.String(7), nullable=False),
        sa.UniqueConstraint("user_id", "category_id", "period", name="uq_budgets_user_cat_period"),
    )

    op.create_table(
        "health_scores",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("breakdown", JSONB, nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "forecasts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("month", sa.String(7), nullable=False),
        sa.Column("predicted", sa.Numeric(14, 2), nullable=False),
        sa.Column("method", sa.String(24), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # Seed categories
    op.execute("""
        INSERT INTO categories (id, name, icon, is_system) VALUES
        (gen_random_uuid(), 'Food & Dining', '🍔', true),
        (gen_random_uuid(), 'Transport', '🚗', true),
        (gen_random_uuid(), 'Shopping', '🛒', true),
        (gen_random_uuid(), 'Entertainment', '🎬', true),
        (gen_random_uuid(), 'Utilities', '💡', true),
        (gen_random_uuid(), 'Healthcare', '🏥', true),
        (gen_random_uuid(), 'Education', '📚', true),
        (gen_random_uuid(), 'Housing', '🏠', true),
        (gen_random_uuid(), 'Income', '💰', true),
        (gen_random_uuid(), 'Debt Payments', '💳', true),
        (gen_random_uuid(), 'Insurance', '🛡️', true),
        (gen_random_uuid(), 'Travel', '✈️', true),
        (gen_random_uuid(), 'Cash Withdrawal', '🏧', true),
        (gen_random_uuid(), 'Investments', '📈', true),
        (gen_random_uuid(), 'Uncategorized', '❓', true)
    """)


def downgrade() -> None:
    op.drop_table("forecasts")
    op.drop_table("health_scores")
    op.drop_table("budgets")
    op.drop_index("ix_transactions_user_category_date")
    op.drop_index("ix_transactions_user_date")
    op.drop_table("transactions")
    op.drop_table("upload_jobs")
    op.drop_table("category_rules")
    op.drop_table("categories")
    op.drop_table("accounts")
    op.drop_table("audit_logs")
    op.drop_index("ix_refresh_tokens_jti")
    op.drop_table("refresh_tokens")
    op.drop_index("ix_users_email")
    op.drop_table("users")
