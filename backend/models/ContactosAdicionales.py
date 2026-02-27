from typing import Optional, TYPE_CHECKING
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from extensions import db
import datetime
import decimal

if TYPE_CHECKING:
    from models.Clientes import Clientes

class ContactosAdicionales(db.Model):
    __tablename__ = 'contactos_adicionales'
    __table_args__ = (
        ForeignKeyConstraint(['id_cliente'], ['clientes.id_cliente'], ondelete='CASCADE', name='contactos_adicionales_ibfk_1'),
        Index('id_cliente', 'id_cliente')
    )

    id_contacto: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50))
    apellidos: Mapped[str] = mapped_column(String(100))
    id_cliente: Mapped[Optional[int]] = mapped_column(Integer)
    telefono: Mapped[Optional[str]] = mapped_column(String(32))
    email: Mapped[Optional[str]] = mapped_column(String(100))

    clientes: Mapped['Clientes'] = relationship('Clientes', back_populates='contactos_adicionales')
