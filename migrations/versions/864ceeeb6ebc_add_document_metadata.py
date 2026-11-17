"""add document metadata

Revision ID: 864ceeeb6ebc
Revises: 32ce5fb2f5f1
Create Date: 2026-11-17 09:43:23.909185

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '864ceeeb6ebc'
down_revision: Union[str, Sequence[str], None] = '32ce5fb2f5f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("documents", sa.Column("doc_type", sa.Text, nullable=True))
    op.add_column("documents", sa.Column("title", sa.Text, nullable=True))
    op.add_column("documents", sa.Column(
        "doc_date",
        sa.Date(),
        nullable=True,
    ))
    op.add_column("documents", sa.Column("company", sa.Text, nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("documents", "doc_type")
    op.drop_column("documents", "title")
    op.drop_column("documents", "doc_date")
    op.drop_column("documents", "company")
