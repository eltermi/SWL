from typing import List, Optional

from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import datetime
import decimal

class Base(DeclarativeBase):
    pass


class Clientes(Base):
    __tablename__ = 'clientes'

    id_cliente: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50))
    apellidos: Mapped[str] = mapped_column(String(100))
    calle: Mapped[Optional[str]] = mapped_column(String(100))
    piso: Mapped[Optional[str]] = mapped_column(String(10))
    codigo_postal: Mapped[Optional[str]] = mapped_column(String(5))
    municipio: Mapped[Optional[str]] = mapped_column(String(50))
    pais: Mapped[Optional[str]] = mapped_column(String(50))
    telefono: Mapped[Optional[str]] = mapped_column(String(15))
    email: Mapped[Optional[str]] = mapped_column(String(100))
    nacionalidad: Mapped[Optional[str]] = mapped_column(String(50))
    idioma: Mapped[Optional[str]] = mapped_column(String(50))
    genero: Mapped[Optional[str]] = mapped_column(Enum('M', 'F'))
    referencia_origen: Mapped[Optional[str]] = mapped_column(String(50))

    animales: Mapped[List['Animales']] = relationship('Animales', back_populates='clientes')
    contactos_adicionales: Mapped[List['ContactosAdicionales']] = relationship('ContactosAdicionales', back_populates='clientes')
    contratos: Mapped[List['Contratos']] = relationship('Contratos', back_populates='clientes')


class Tarifas(Base):
    __tablename__ = 'tarifas'

    id_tarifa: Mapped[int] = mapped_column(Integer, primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(100))
    precio_base: Mapped[decimal.Decimal] = mapped_column(DECIMAL(10, 2))
    descuento_por_visita: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(10, 2))
    tarifa_adicional_por_animal: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(10, 2))

    tarifas_contrato: Mapped[List['TarifasContrato']] = relationship('TarifasContrato', back_populates='tarifas')


class Usuarios(Base):
    __tablename__ = 'usuarios'
    __table_args__ = (
        Index('username', 'username', unique=True),
    )

    id_usuario: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50))
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Optional[str]] = mapped_column(Enum('admin', 'user'), server_default=text("'user'"))


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


class ContactosAdicionales(Base):
    __tablename__ = 'contactos_adicionales'
    __table_args__ = (
        ForeignKeyConstraint(['id_cliente'], ['clientes.id_cliente'], ondelete='CASCADE', name='contactos_adicionales_ibfk_1'),
        Index('id_cliente', 'id_cliente')
    )

    id_contacto: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50))
    apellidos: Mapped[str] = mapped_column(String(100))
    id_cliente: Mapped[Optional[int]] = mapped_column(Integer)
    telefono: Mapped[Optional[str]] = mapped_column(String(15))
    email: Mapped[Optional[str]] = mapped_column(String(100))

    clientes: Mapped['Clientes'] = relationship('Clientes', back_populates='contactos_adicionales')


class Contratos(Base):
    __tablename__ = 'contratos'
    __table_args__ = (
        ForeignKeyConstraint(['id_cliente'], ['clientes.id_cliente'], ondelete='CASCADE', name='contratos_ibfk_1'),
        Index('id_cliente', 'id_cliente')
    )

    id_contrato: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date)
    fecha_fin: Mapped[datetime.date] = mapped_column(Date)
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

    contratos: Mapped['Contratos'] = relationship('Contratos', back_populates='tarifas_contrato')
    tarifas: Mapped['Tarifas'] = relationship('Tarifas', back_populates='tarifas_contrato')
