from typing import List, Optional
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from extensions import db
import datetime
import decimal

class Usuarios(db.Model):
    __tablename__ = 'usuarios'
    __table_args__ = (
        Index('username', 'username', unique=True),
    )

    id_usuario: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50))
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Optional[str]] = mapped_column(Enum('admin', 'user'), server_default=text("'user'"))


