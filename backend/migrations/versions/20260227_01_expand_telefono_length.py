"""expand telefono length to 32 chars

Revision ID: 20260227_01
Revises:
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260227_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("clientes", "telefono", existing_type=sa.String(length=15), type_=sa.String(length=32))
    op.alter_column("contactos_adicionales", "telefono", existing_type=sa.String(length=15), type_=sa.String(length=32))


def downgrade():
    op.alter_column("clientes", "telefono", existing_type=sa.String(length=32), type_=sa.String(length=15))
    op.alter_column("contactos_adicionales", "telefono", existing_type=sa.String(length=32), type_=sa.String(length=15))
