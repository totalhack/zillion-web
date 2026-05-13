from typing import Any, Dict, Optional, Union

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.models.user_warehouse_access import UserWarehouseAccess
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def _set_warehouse_access(
        self, db_obj: User, warehouse_ids: Optional[list[int]]
    ) -> None:
        if warehouse_ids is None:
            return

        normalized_ids = sorted({int(warehouse_id) for warehouse_id in warehouse_ids})
        current_ids = {access.warehouse_id for access in db_obj.warehouse_accesses}

        for access in list(db_obj.warehouse_accesses):
            if access.warehouse_id not in normalized_ids:
                db_obj.warehouse_accesses.remove(access)

        for warehouse_id in normalized_ids:
            if warehouse_id not in current_ids:
                db_obj.warehouse_accesses.append(
                    UserWarehouseAccess(warehouse_id=warehouse_id)
                )

    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        warehouse_ids = obj_in.warehouse_ids
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_active=obj_in.is_active,
            is_superuser=obj_in.is_superuser,
        )
        self._set_warehouse_access(db_obj, warehouse_ids)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        if isinstance(obj_in, dict):
            update_data = obj_in.copy()
        else:
            update_data = obj_in.dict(exclude_unset=True)
        warehouse_ids = update_data.pop("warehouse_ids", None)
        if update_data.get("password", None):
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        db_obj = super().update(db, db_obj=db_obj, obj_in=update_data)
        self._set_warehouse_access(db_obj, warehouse_ids)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def is_active(self, user: User) -> bool:
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        return user.is_superuser


user = CRUDUser(User)
