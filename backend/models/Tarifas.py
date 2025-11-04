from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from extensions import db
import datetime
import decimal

if TYPE_CHECKING:
    from models.TarifasContrato import TarifasContrato

class Tarifas(db.Model):
    __tablename__ = 'tarifas'

    id_tarifa: Mapped[int] = mapped_column(Integer, primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(100))
    precio_base: Mapped[decimal.Decimal] = mapped_column(DECIMAL(10, 2))
    descuento_por_visita: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(10, 2))
    tarifa_adicional_por_animal: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(10, 2))

    tarifas_contrato: Mapped[List['TarifasContrato']] = relationship('TarifasContrato', back_populates='tarifas')

