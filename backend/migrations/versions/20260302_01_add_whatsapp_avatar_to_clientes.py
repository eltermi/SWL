"""add whatsapp avatar blob to clientes

Revision ID: 20260302_01
Revises: 20260227_01
Create Date: 2026-03-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


# revision identifiers, used by Alembic.
revision = "20260302_01"
down_revision = "20260227_01"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("clientes", sa.Column("whatsapp_avatar", mysql.LONGBLOB(), nullable=True))


def downgrade():
    op.drop_column("clientes", "whatsapp_avatar")
