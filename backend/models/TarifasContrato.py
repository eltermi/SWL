from typing import List, Optional
from models import Base  # Importa Base desde __init__.py
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import datetime
import decimal

class TarifasContrato(Base):
    __tablename__ = 'tarifas_contrato'
    __table_args__ = (
        ForeignKeyConstraint(['id_contrato'], ['contratos.id_contrato'], ondelete='CASCADE', name='tarifas_contrato_ibfk_1'),
        ForeignKeyConstraint(['id_tarifa'], ['tarifas.id_tarifa'], ondelete='CASCADE', name='tarifas_contrato_ibfk_2'),
        Index('id_contrato', 'id_contrato'),
        Index('id_tarifa', 'id_tarifa')
    )

    id_tarifa_contrato: Mapped[int] = mapped_column(Integer, primary_key=True)
    id_contrato: Mapped[Optional[int]] = mapped_column(Integer)
    id_tarifa: Mapped[Optional[int]] = mapped_column(Integer)

    Contratos: Mapped['Contratos'] = relationship('Contratos', back_populates='Tarifas_contrato')
    Tarifas: Mapped['Tarifas'] = relationship('Tarifas', back_populates='Tarifas_contrato')
