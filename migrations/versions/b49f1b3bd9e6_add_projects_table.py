"""add projects table

Revision ID: b49f1b3bd9e6
Revises: 864ceeeb6ebc
Create Date: 2026-11-24 12:04:44.088353

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b49f1b3bd9e6'
down_revision: Union[str, Sequence[str], None] = '864ceeeb6ebc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.add_column('documents', sa.Column('project_id', sa.Integer, sa.ForeignKey('projects.id')))

def downgrade() -> None:
    op.drop_column('documents', 'project_id')
    op.drop_table('projects')
