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
    def obtener_clientes(cls, filtro, incluir_fallecidos=False):
        sql_query = text("""
            SELECT
                clientes.id_cliente,
                clientes.nombre,
                clientes.apellidos,
                clientes.calle,
                clientes.piso,
                clientes.codigo_postal,
                clientes.municipio,
                clientes.telefono,
                contactos_adicionales.nombre AS ad_nombre,
                contactos_adicionales.apellidos AS ad_apellidos,
                contactos_adicionales.telefono AS ad_telefono,
                (
                    SELECT CASE
                        WHEN COUNT(*) > 1 THEN CONCAT(
                            SUBSTRING_INDEX(GROUP_CONCAT(a_lista.nombre ORDER BY a_lista.nombre SEPARATOR ', '), ', ', COUNT(*) - 1),
                            ' y ',
                            SUBSTRING_INDEX(GROUP_CONCAT(a_lista.nombre ORDER BY a_lista.nombre SEPARATOR ', '), ', ', -1)
                        )
                        ELSE GROUP_CONCAT(a_lista.nombre ORDER BY a_lista.nombre SEPARATOR ', ')
                    END
                    FROM SWL.animales a_lista
                    WHERE a_lista.id_cliente = clientes.id_cliente
                      AND (:incluir_fallecidos = 1 OR COALESCE(a_lista.fallecido, 0) = 0)
                ) AS gatos,
                EXISTS(
                    SELECT 1
                    FROM SWL.animales a_vivos
                    WHERE a_vivos.id_cliente = clientes.id_cliente
                      AND COALESCE(a_vivos.fallecido, 0) = 0
                ) AS tiene_animales_vivos,
                EXISTS(
                    SELECT 1
                    FROM SWL.animales a_todos
                    WHERE a_todos.id_cliente = clientes.id_cliente
                ) AS tiene_animales
            FROM SWL.clientes
            LEFT JOIN contactos_adicionales ON contactos_adicionales.id_cliente = clientes.id_cliente
            WHERE (
                :filtro_vacio = 1
                OR clientes.nombre LIKE :filtro
                OR clientes.municipio LIKE :filtro
                OR clientes.apellidos LIKE :filtro
                OR contactos_adicionales.nombre LIKE :filtro
                OR EXISTS(
                    SELECT 1
                    FROM SWL.animales a_busqueda
                    WHERE a_busqueda.id_cliente = clientes.id_cliente
                      AND (:incluir_fallecidos = 1 OR COALESCE(a_busqueda.fallecido, 0) = 0)
                      AND a_busqueda.nombre LIKE :filtro
                )
            )
            AND (
                :incluir_fallecidos = 1
                OR EXISTS(
                    SELECT 1
                    FROM SWL.animales a_vivos
                    WHERE a_vivos.id_cliente = clientes.id_cliente
                      AND COALESCE(a_vivos.fallecido, 0) = 0
                )
                OR NOT EXISTS(
                    SELECT 1
                    FROM SWL.animales a_todos
                    WHERE a_todos.id_cliente = clientes.id_cliente
                )
            )
            GROUP BY clientes.id_cliente,
                    clientes.nombre,
                    clientes.apellidos,
                    clientes.calle,
                    clientes.piso,
                    clientes.codigo_postal,
                    clientes.municipio,
                    clientes.telefono,
                    contactos_adicionales.nombre,
                    contactos_adicionales.apellidos,
                    contactos_adicionales.telefono
            ORDER BY clientes.nombre
        """)

        filtro_normalizado = f"%{filtro}%" if filtro else ""
        result = db.session.execute(sql_query, {
            "filtro": filtro_normalizado,
            "filtro_vacio": 0 if filtro else 1,
            "incluir_fallecidos": 1 if incluir_fallecidos else 0
        })
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
