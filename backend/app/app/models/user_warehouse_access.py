from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class UserWarehouseAccess(Base):
    __tablename__ = "user_warehouse_access"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    warehouse_id = Column(Integer, nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "warehouse_id",
            name="uq_user_warehouse_access_user_warehouse",
        ),
    )

    user = relationship("User", back_populates="warehouse_accesses")
