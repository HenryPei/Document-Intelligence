"""create documents and pages

Revision ID: 32ce5fb2f5f1
Revises: 
Create Date: 2026-11-05 10:53:11.341837

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '32ce5fb2f5f1'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("sha256", sa.Text, nullable=False, unique=True),
        sa.Column("original_filename", sa.Text, nullable=False),
        sa.Column("stored_path", sa.Text, nullable=False),
        sa.Column("file_type", sa.Text, nullable=False),
        sa.Column("page_count", sa.Integer),
        sa.Column("status", sa.Text, nullable=False, server_default="queued"),
        sa.Column("error_message", sa.Text),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "pages",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("document_id", sa.Integer, sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_number", sa.Integer, nullable=False),
        sa.Column("text", sa.Text),
        sa.Column("extraction_method", sa.Text, nullable=False),
        sa.Column("search_vector", postgresql.TSVECTOR, sa.Computed("to_tsvector('simple', coalesce(text, ''))", persisted=True)),
        sa.UniqueConstraint("document_id", "page_number"),
    )

    op.create_index(
        "ix_pages_search_vector",
        "pages",
        ["search_vector"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_pages_search_vector", table_name="pages")
    op.drop_table("pages")
    op.drop_table("documents")
