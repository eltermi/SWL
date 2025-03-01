from operator import and_
from typing import List, Optional
from models import Clientes, TarifasContrato
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text, select, and_
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from extensions import db
from datetime import date
import decimal
import base64


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
    
    @classmethod
    def obtener_contratos_activos(cls):
        hoy = date.today()

        sql_query = text("""
            SELECT  contratos.id_contrato, 
                    contratos.id_cliente, 
                    MAX(animales.foto) AS foto,
                CASE 
                    WHEN COUNT(animales.nombre) > 1 
                    THEN CONCAT(
                            SUBSTRING_INDEX(GROUP_CONCAT(animales.nombre ORDER BY animales.nombre SEPARATOR ', '), ', ', COUNT(animales.nombre) - 1), 
                            ' y ', 
                            SUBSTRING_INDEX(GROUP_CONCAT(animales.nombre ORDER BY animales.nombre SEPARATOR ', '), ', ', -1)
                    ) 
                    ELSE GROUP_CONCAT(animales.nombre ORDER BY animales.nombre SEPARATOR ', ') 
                END AS nombre_animales,
                contratos.fecha_inicio, 
                contratos.fecha_fin, 
                contratos.numero_visitas_diarias as visitas, 
                contratos.horario_visitas as horario, 
                contratos.estado_pago_adelantado,  
                contratos.estado_pago_final, 
                tarifas.descripcion AS nombre_tarifa  
            FROM SWL.contratos
            INNER JOIN clientes ON contratos.id_cliente = clientes.id_cliente
            INNER JOIN animales ON animales.id_cliente = clientes.id_cliente
            INNER JOIN tarifas_contrato ON tarifas_contrato.id_contrato = contratos.id_contrato
            INNER JOIN tarifas ON tarifas.id_tarifa = tarifas_contrato.id_tarifa  
            WHERE contratos.fecha_inicio <= :fecha_hoy
            AND contratos.fecha_fin >= :fecha_hoy
            GROUP BY contratos.id_contrato, contratos.id_cliente, contratos.fecha_inicio, contratos.fecha_fin, 
                    contratos.numero_visitas_diarias, contratos.horario_visitas, contratos.estado_pago_adelantado, 
                    contratos.estado_pago_final, tarifas.descripcion
            ORDER BY contratos.fecha_inicio, contratos.fecha_fin;
        """)

        result = db.session.execute(sql_query, {"fecha_hoy": hoy})

        contratos = []
        for row in result:
            foto_base64 = None
            if row.foto:  # Si hay una imagen, la convertimos a Base64
                foto_base64 = base64.b64encode(row.foto).decode("utf-8")

            contratos.append({
                "id_contrato": row.id_contrato,
                "nombre_animales": row.nombre_animales,
                "fecha_inicio": row.fecha_inicio.strftime("%d-%m-%Y"),
                "fecha_fin": row.fecha_fin.strftime("%d-%m-%Y"),
                "horario": row.horario, 
                "visitas": row.visitas,
                "tarifa": row.nombre_tarifa,
                "foto": f"data:image/jpeg;base64,{foto_base64}" if foto_base64 else None  # Formato para HTML
            })

        return contratos  # Retorna la lista de diccionarios
    
    @classmethod
    def obtener_contrato(cls, id_contrato):

        sql_query = text("""
            SELECT  contratos.id_contrato, 
                    contratos.id_cliente, 
                    MAX(animales.foto) AS foto,
                CASE 
                    WHEN COUNT(animales.nombre) > 1 
                    THEN CONCAT(
                            SUBSTRING_INDEX(GROUP_CONCAT(animales.nombre ORDER BY animales.nombre SEPARATOR ', '), ', ', COUNT(animales.nombre) - 1), 
                            ' y ', 
                            SUBSTRING_INDEX(GROUP_CONCAT(animales.nombre ORDER BY animales.nombre SEPARATOR ', '), ', ', -1)
                    ) 
                    ELSE GROUP_CONCAT(animales.nombre ORDER BY animales.nombre SEPARATOR ', ') 
                END AS nombre_animales,
                contratos.fecha_inicio, 
                contratos.fecha_fin, 
                contratos.numero_visitas_diarias as visitas, 
                contratos.horario_visitas as horario, 
                contratos.estado_pago_adelantado,  
                contratos.estado_pago_final, 
                tarifas.descripcion AS nombre_tarifa  
            FROM SWL.contratos
            INNER JOIN clientes ON contratos.id_cliente = clientes.id_cliente
            INNER JOIN animales ON animales.id_cliente = clientes.id_cliente
            INNER JOIN tarifas_contrato ON tarifas_contrato.id_contrato = contratos.id_contrato
            INNER JOIN tarifas ON tarifas.id_tarifa = tarifas_contrato.id_tarifa  
            WHERE contratos.id_contrato = :id_contrato
            GROUP BY contratos.id_contrato, contratos.id_cliente, contratos.fecha_inicio, contratos.fecha_fin, 
                    contratos.numero_visitas_diarias, contratos.horario_visitas, contratos.estado_pago_adelantado, 
                    contratos.estado_pago_final, tarifas.descripcion
            ORDER BY contratos.fecha_inicio, contratos.fecha_fin;
        """)

        result = db.session.execute(sql_query, {"id_contrato": id_contrato}).fetchone()

        foto_base64 = None
        if result.foto:  # Si hay una imagen, la convertimos a Base64
                foto_base64 = base64.b64encode(result.foto).decode("utf-8")

        contrato = {
            "id_contrato": result.id_contrato,
            "nombre_animales": result.nombre_animales,
            "fecha_inicio": result.fecha_inicio.strftime("%d-%m-%Y"),
            "fecha_fin": result.fecha_fin.strftime("%d-%m-%Y"),
            "horario": result.horario, 
            "visitas": result.visitas,
            "tarifa": result.nombre_tarifa,
            "foto": f"data:image/jpeg;base64,{foto_base64}" if foto_base64 else None  # Formato para HTML
        }

        return contrato