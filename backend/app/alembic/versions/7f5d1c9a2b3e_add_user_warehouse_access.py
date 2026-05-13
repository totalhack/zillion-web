"""Add user warehouse access

Revision ID: 7f5d1c9a2b3e
Revises: d4867f3a4c0a
Create Date: 2026-05-11 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7f5d1c9a2b3e"
down_revision = "d4867f3a4c0a"
branch_labels = None
depends_on = None


def upgrade():
    user_table = sa.table(
        "user",
        sa.column("id", sa.Integer()),
    )
    user_warehouse_access_table = sa.table(
        "user_warehouse_access",
        sa.column("user_id", sa.Integer()),
        sa.column("warehouse_id", sa.Integer()),
    )

    op.create_table(
        "user_warehouse_access",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "warehouse_id",
            name="uq_user_warehouse_access_user_warehouse",
        ),
    )
    op.create_index(
        op.f("ix_user_warehouse_access_id"),
        "user_warehouse_access",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_warehouse_access_user_id"),
        "user_warehouse_access",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_warehouse_access_warehouse_id"),
        "user_warehouse_access",
        ["warehouse_id"],
        unique=False,
    )
    op.execute(
        user_warehouse_access_table.insert().from_select(
            ["user_id", "warehouse_id"],
            sa.select(user_table.c.id, sa.literal(1)),
        )
    )


def downgrade():
    op.drop_index(
        op.f("ix_user_warehouse_access_warehouse_id"),
        table_name="user_warehouse_access",
    )
    op.drop_index(
        op.f("ix_user_warehouse_access_user_id"),
        table_name="user_warehouse_access",
    )
    op.drop_index(
        op.f("ix_user_warehouse_access_id"), table_name="user_warehouse_access"
    )
    op.drop_table("user_warehouse_access")
