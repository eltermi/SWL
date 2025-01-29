from typing import List, Optional
from models import Base  # Importa Base desde __init__.py
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import datetime
import decimal

class Animales(Base):
    __tablename__ = 'animales'
    __table_args__ = (
        ForeignKeyConstraint(['id_cliente'], ['clientes.id_cliente'], ondelete='CASCADE', name='animales_ibfk_1'),
        Index('id_cliente', 'id_cliente')
    )

    id_animal: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo_animal: Mapped[str] = mapped_column(String(50))
    nombre: Mapped[str] = mapped_column(String(50))
    id_cliente: Mapped[Optional[int]] = mapped_column(Integer)
    edad: Mapped[Optional[int]] = mapped_column(Integer)
    medicacion: Mapped[Optional[str]] = mapped_column(Text)
    foto: Mapped[Optional[bytes]] = mapped_column(LONGBLOB)

    clientes: Mapped['Clientes'] = relationship('Clientes', back_populates='animales')


