from typing import List, Optional
from models import Animales, ContactosAdicionales, Contratos
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from extensions import db
import datetime
import decimal

class Clientes(db.Model):  # Usar db.Model en lugar de DeclarativeBase
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


