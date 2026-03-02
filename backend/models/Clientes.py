from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from extensions import db
import datetime
import decimal

if TYPE_CHECKING:
    from models.animales import Animales
    from models.ContactosAdicionales import ContactosAdicionales
    from models.Contratos import Contratos

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
    telefono: Mapped[Optional[str]] = mapped_column(String(32))
    email: Mapped[Optional[str]] = mapped_column(String(100))
    nacionalidad: Mapped[Optional[str]] = mapped_column(String(50))
    idioma: Mapped[Optional[str]] = mapped_column(String(50))
    genero: Mapped[Optional[str]] = mapped_column(Enum('M', 'F'))
    referencia_origen: Mapped[Optional[str]] = mapped_column(String(50))
    whatsapp_avatar: Mapped[Optional[bytes]] = mapped_column(LONGBLOB)

    animales: Mapped[List['Animales']] = relationship('Animales', back_populates='clientes')
    contactos_adicionales: Mapped[List['ContactosAdicionales']] = relationship('ContactosAdicionales', back_populates='clientes')
    contratos: Mapped[List['Contratos']] = relationship('Contratos', back_populates='clientes')

    @classmethod
    def obtener_clientes(cls, filtro):
        sql_query_select = text("""
                    SELECT clientes.id_cliente,
                    clientes.nombre,
                    clientes.apellidos,
                    clientes.calle,
                    clientes.piso,
                    clientes.codigo_postal,
                    clientes.municipio,
                    clientes.telefono,
                    contactos_adicionales.nombre as ad_nombre,
                    contactos_adicionales.apellidos as ad_apellidos,
                    contactos_adicionales.telefono as ad_telefono,
                        -- Concatenamos los nombres de los gatos, cambiando la última coma por " y "
                    CASE 
                        WHEN COUNT(animales.nombre) > 1 
                        THEN CONCAT(
                                SUBSTRING_INDEX(GROUP_CONCAT(animales.nombre ORDER BY animales.nombre SEPARATOR ', '), ', ', COUNT(animales.nombre) - 1), 
                                ' y ', 
                                SUBSTRING_INDEX(GROUP_CONCAT(animales.nombre ORDER BY animales.nombre SEPARATOR ', '), ', ', -1)
                        ) 
                        ELSE GROUP_CONCAT(animales.nombre ORDER BY animales.nombre SEPARATOR ', ') 
                    END AS gatos
                FROM SWL.clientes
                LEFT JOIN animales ON animales.id_cliente = clientes.id_cliente
                LEFT JOIN contactos_adicionales ON contactos_adicionales.id_cliente = clientes.id_cliente
        """)

        sql_query_group = text("""
                GROUP BY clientes.id_cliente,
                        clientes.nombre,
                        clientes.apellidos,
                        clientes.municipio,
                        clientes.telefono,
                        contactos_adicionales.nombre,
                        contactos_adicionales.apellidos,
                        contactos_adicionales.telefono 
                ORDER BY clientes.nombre
        """)

        if filtro:
            filtro = f"%{filtro}%"  # Añadir los % en Python
            sql_where = text("""
                WHERE clientes.nombre like :filtro
                    OR clientes.municipio like :filtro
                    OR clientes.apellidos like :filtro
                    OR animales.nombre like :filtro
                    OR contactos_adicionales.nombre like :filtro
            """)
            sql_query = text(f"{sql_query_select.text} {sql_where} {sql_query_group.text}")
            result = db.session.execute(sql_query, {"filtro": filtro})
        else:
            sql_query = text(f"{sql_query_select.text} {sql_query_group.text}")
            result = db.session.execute(sql_query)
        return result  # Retorna la lista de diccionarios
            

    @classmethod
    def obtener_datos_cliente(cls, id_cliente):
        sql_query_cliente = text("""
                     SELECT clientes.id_cliente,
                            clientes.nombre,
                            clientes.apellidos,
                            clientes.calle,
                            clientes.piso,
                            clientes.codigo_postal,
                            clientes.municipio,
                            clientes.pais,
                            clientes.telefono,
                            clientes.email,
                            clientes.nacionalidad,
                            clientes.idioma,
                            clientes.genero,
                            clientes.referencia_origen as referencia,
                            clientes.whatsapp_avatar,
                            contactos_adicionales.nombre as ad_nombre,
                            contactos_adicionales.apellidos as ad_apellidos,
                            contactos_adicionales.telefono as ad_telefono,
                            contactos_adicionales.email as ad_email
                        FROM SWL.clientes
                        LEFT JOIN contactos_adicionales ON contactos_adicionales.id_cliente = clientes.id_cliente
                        WHERE clientes.id_cliente = :id_cliente
        """)
        result = db.session.execute(sql_query_cliente, {"id_cliente": id_cliente}).fetchone()
        return result
