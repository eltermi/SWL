from operator import and_
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text, select, and_
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from extensions import db
from datetime import date, timedelta
import decimal
import base64

if TYPE_CHECKING:
    from models.Clientes import Clientes
    from models.TarifasContrato import TarifasContrato


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
        dias = [hoy + timedelta(days=i) for i in range(8)]
        etiquetas = ["HOY", "MAÑANA"] + [(hoy + timedelta(days=i)).strftime("%d-%m-%Y") for i in range(2, 8)]

        resultados = {}

        for fecha, etiqueta in zip(dias, etiquetas):
            sql_query = text("""
                SELECT c.id_contrato,
                    c.id_cliente,
                    c.fecha_inicio,
                    c.fecha_fin,
                    c.numero_visitas_diarias,
                    c.horario_visitas,
                    c.estado_pago_adelantado,
                    c.estado_pago_final,
                    t.descripcion AS nombre_tarifa,
                    (
                        SELECT 
                            CASE 
                                WHEN COUNT(a.nombre) > 1 
                                THEN CONCAT(
                                    SUBSTRING_INDEX(GROUP_CONCAT(a.nombre ORDER BY a.nombre SEPARATOR ', '), ', ', COUNT(a.nombre) - 1), 
                                    ' y ', 
                                    SUBSTRING_INDEX(GROUP_CONCAT(a.nombre ORDER BY a.nombre SEPARATOR ', '), ', ', -1)
                                ) 
                                ELSE GROUP_CONCAT(a.nombre ORDER BY a.nombre SEPARATOR ', ') 
                            END
                        FROM animales a
                        WHERE a.id_cliente = c.id_cliente
                    ) AS nombre_animales
                FROM contratos c
                LEFT JOIN tarifas_contrato tc ON tc.id_contrato = c.id_contrato
                LEFT JOIN tarifas t ON t.id_tarifa = tc.id_tarifa
                WHERE c.fecha_inicio <= :hoy
                AND c.fecha_fin >= :hoy
                ORDER BY c.fecha_inicio;
            """)

            result = db.session.execute(sql_query, {"hoy": fecha})
            contratos_dia = []
            for row in result:
                contratos_dia.append({
                    "id_contrato": row.id_contrato,
                    "id_cliente": row.id_cliente,
                    "fecha_inicio": row.fecha_inicio.strftime("%d-%m-%Y"),
                    "fecha_fin": row.fecha_fin.strftime("%d-%m-%Y"),
                    "visitas": row.numero_visitas_diarias,
                    "horario": row.horario_visitas,
                    "estado_pago_adelantado": row.estado_pago_adelantado,
                    "estado_pago_final": row.estado_pago_final,
                    "tarifa": row.nombre_tarifa,
                    "nombre_animales": row.nombre_animales
                })

            resultados[etiqueta] = contratos_dia

        return resultados
    
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
            LEFT JOIN clientes ON contratos.id_cliente = clientes.id_cliente
            LEFT JOIN animales ON animales.id_cliente = clientes.id_cliente
            LEFT JOIN tarifas_contrato ON tarifas_contrato.id_contrato = contratos.id_contrato
            LEFT JOIN tarifas ON tarifas.id_tarifa = tarifas_contrato.id_tarifa  
            WHERE contratos.id_contrato = :id_contrato
            GROUP BY contratos.id_contrato, contratos.id_cliente, contratos.fecha_inicio, contratos.fecha_fin, 
                    contratos.numero_visitas_diarias, contratos.horario_visitas, contratos.estado_pago_adelantado, 
                    contratos.estado_pago_final, tarifas.descripcion
            ORDER BY contratos.fecha_inicio, contratos.fecha_fin;
        """)

        result = db.session.execute(sql_query, {"id_contrato": id_contrato}).fetchone()
        if not result:
            return None  # O podrías lanzar un error 404 con abort(404)

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
