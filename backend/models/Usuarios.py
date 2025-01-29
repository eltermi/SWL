from typing import List, Optional
from models import Base  # Importa Base desde __init__.py
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import datetime
import decimal

class Usuarios(Base):
    __tablename__ = 'usuarios'
    __table_args__ = (
        Index('username', 'username', unique=True),
    )

    id_usuario: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50))
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Optional[str]] = mapped_column(Enum('admin', 'user'), server_default=text("'user'"))


