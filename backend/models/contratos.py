from typing import List, Optional
from models import Clientes, TarifasContrato
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from extensions import db
from datetime import date
import decimal

class Contratos(db.Model):
    __tablename__ = 'contratos'
    __table_args__ = (
        ForeignKeyConstraint(['id_cliente'], ['clientes.id_cliente'], ondelete='CASCADE', name='contratos_ibfk_1'),
        Index('id_cliente', 'id_cliente')
    )

    id_contrato: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha_inicio: Mapped[date] = mapped_column(Date)
    fecha_fin: Mapped[date] = mapped_column(Date)
    numero_visitas_diarias: Mapped[int] = mapped_column(Integer)
    horario_visitas: Mapped[dict] = mapped_column(JSON)
    pago_adelantado: Mapped[decimal.Decimal] = mapped_column(DECIMAL(10, 2))
    pago_final: Mapped[decimal.Decimal] = mapped_column(DECIMAL(10, 2))
    id_cliente: Mapped[Optional[int]] = mapped_column(Integer)
    estado_pago_adelantado: Mapped[Optional[str]] = mapped_column(Enum('Pendiente', 'Pagado'), server_default=text("'Pendiente'"))
    estado_pago_final: Mapped[Optional[str]] = mapped_column(Enum('Pendiente', 'Pagado'), server_default=text("'Pendiente'"))
    observaciones: Mapped[Optional[str]] = mapped_column(Text)
    factura: Mapped[Optional[bytes]] = mapped_column(LONGBLOB)

    clientes: Mapped['Clientes'] = relationship('Clientes', back_populates='contratos')
    tarifas_contrato: Mapped[List['TarifasContrato']] = relationship('TarifasContrato', back_populates='contratos')

def obtener_contratos_activos():
    """
    Devuelve todos los contratos en los que la fecha de finalización es igual o superior a hoy.
    """
    hoy = date.today()
    return Contratos.query.filter(Contratos.fecha_fin >= hoy).all()
