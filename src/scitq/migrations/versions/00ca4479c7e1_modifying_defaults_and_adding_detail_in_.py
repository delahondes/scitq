"""Modifying defaults and adding detail in workers

Revision ID: 00ca4479c7e1
Revises: 
Create Date: 2023-12-08 15:39:55.492553

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '00ca4479c7e1'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.add_column(sa.Column('retry', sa.Integer(), nullable=False,server_default="0"))
        batch_op.alter_column('batch',
               existing_type=sa.VARCHAR(),
               nullable=False)

    with op.batch_alter_table('worker', schema=None) as batch_op:
        batch_op.add_column(sa.Column('task_properties', sa.String(), nullable=False,server_default='{}'))
        batch_op.add_column(sa.Column('flavor', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('region', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('provider', sa.String(), nullable=True))
        batch_op.alter_column('concurrency',
               existing_type=sa.INTEGER(),
               nullable=False)
        batch_op.alter_column('batch',
               existing_type=sa.VARCHAR(),
               nullable=False)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('worker', schema=None) as batch_op:
        batch_op.alter_column('batch',
               existing_type=sa.VARCHAR(),
               nullable=True)
        batch_op.alter_column('concurrency',
               existing_type=sa.INTEGER(),
               nullable=True)
        batch_op.drop_column('provider')
        batch_op.drop_column('region')
        batch_op.drop_column('flavor')
        batch_op.drop_column('task_properties')

    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.alter_column('batch',
               existing_type=sa.VARCHAR(),
               nullable=True)
        batch_op.drop_column('retry')

    # ### end Alembic commands ###