from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import DECIMAL, Date, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
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
    total: Mapped[decimal.Decimal] = mapped_column("Total", DECIMAL(10, 2))
    pagado: Mapped[decimal.Decimal] = mapped_column("Pagado", DECIMAL(10, 2), server_default=text("0"))
    id_cliente: Mapped[Optional[int]] = mapped_column(Integer)
    observaciones: Mapped[Optional[str]] = mapped_column(Text)
    num_factura: Mapped[Optional[str]] = mapped_column(String(45))
    num_total_visitas: Mapped[Optional[str]] = mapped_column(String(45))

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
                    c.Total AS total,
                    c.Pagado AS pagado,
                    c.num_factura,
                    c.num_total_visitas,
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
                    "total": float(row.total or 0),
                    "pagado": float(row.pagado or 0),
                    "num_factura": row.num_factura,
                    "num_total_visitas": row.num_total_visitas,
                    "tarifa": row.nombre_tarifa,
                    "nombre_animales": row.nombre_animales
                })

            resultados[etiqueta] = contratos_dia

        return resultados
    
    @classmethod
    def obtener_contratos_programados(cls):
        hoy = date.today()
        sql_query = text("""
            SELECT  c.id_contrato,
                    c.fecha_inicio,
                    c.fecha_fin,
                CASE 
                    WHEN COUNT(a.nombre) > 1 
                    THEN CONCAT(
                            SUBSTRING_INDEX(GROUP_CONCAT(a.nombre ORDER BY a.nombre SEPARATOR ', '), ', ', COUNT(a.nombre) - 1), 
                            ' y ', 
                            SUBSTRING_INDEX(GROUP_CONCAT(a.nombre ORDER BY a.nombre SEPARATOR ', '), ', ', -1)
                    ) 
                    ELSE GROUP_CONCAT(a.nombre ORDER BY a.nombre SEPARATOR ', ')
                END AS nombre_animales
            FROM contratos c
            LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
            LEFT JOIN animales a ON a.id_cliente = cl.id_cliente
            WHERE c.fecha_fin >= :hoy
            GROUP BY c.id_contrato, c.fecha_inicio, c.fecha_fin
            ORDER BY c.fecha_inicio ASC, c.id_contrato ASC;
        """)

        resultados = db.session.execute(sql_query, {"hoy": hoy}).fetchall()

        contratos = []
        for row in resultados:
            contratos.append({
                "id_contrato": row.id_contrato,
                "nombre_animales": row.nombre_animales or "Sin animales asignados",
                "fecha_inicio": row.fecha_inicio.strftime("%d-%m-%Y") if row.fecha_inicio else None,
                "fecha_fin": row.fecha_fin.strftime("%d-%m-%Y") if row.fecha_fin else None
            })

        return contratos

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
                contratos.Total AS total,
                contratos.Pagado AS pagado,
                contratos.num_factura,
                contratos.num_total_visitas,
                contratos.observaciones,
                tarifas.descripcion AS nombre_tarifa,
                tarifas.precio_base AS precio_tarifa
            FROM SWL.contratos
            LEFT JOIN clientes ON contratos.id_cliente = clientes.id_cliente
            LEFT JOIN animales ON animales.id_cliente = clientes.id_cliente
            LEFT JOIN tarifas_contrato ON tarifas_contrato.id_contrato = contratos.id_contrato
            LEFT JOIN tarifas ON tarifas.id_tarifa = tarifas_contrato.id_tarifa  
            WHERE contratos.id_contrato = :id_contrato
            GROUP BY contratos.id_contrato, contratos.id_cliente, contratos.fecha_inicio, contratos.fecha_fin, 
                    contratos.numero_visitas_diarias, contratos.horario_visitas, contratos.Total,
                    contratos.Pagado, contratos.num_factura, contratos.num_total_visitas, contratos.observaciones, tarifas.descripcion, tarifas.precio_base
            ORDER BY contratos.fecha_inicio, contratos.fecha_fin;
        """)

        result = db.session.execute(sql_query, {"id_contrato": id_contrato}).fetchone()
        if not result:
            return None  # O podrías lanzar un error 404 con abort(404)

        foto_base64 = None
        if result.foto:  # Si hay una imagen, la convertimos a Base64
                foto_base64 = base64.b64encode(result.foto).decode("utf-8")

        total = float(result.total or 0)
        pagado = float(result.pagado or 0)
        pendiente = round(total - pagado, 2)

        contrato = {
            "id_contrato": result.id_contrato,
            "id_cliente": result.id_cliente,
            "nombre_animales": result.nombre_animales,
            "fecha_inicio": result.fecha_inicio.strftime("%d-%m-%Y"),
            "fecha_fin": result.fecha_fin.strftime("%d-%m-%Y"),
            "horario": result.horario, 
            "visitas": result.visitas,
            "tarifa": result.nombre_tarifa,
            "precio_tarifa": float(result.precio_tarifa) if result.precio_tarifa is not None else None,
            "total": total,
            "pagado": pagado,
            "pendiente": pendiente,
            "num_factura": result.num_factura,
            "num_total_visitas": result.num_total_visitas,
            "observaciones": result.observaciones,
            "foto": f"data:image/jpeg;base64,{foto_base64}" if foto_base64 else None  # Formato para HTML
        }

        return contrato

    @classmethod
    def obtener_contratos_cliente(cls, id_cliente):
        sql_query = text("""
            SELECT  c.id_contrato,
                    c.fecha_inicio,
                    c.fecha_fin,
                    c.numero_visitas_diarias AS visitas,
                    c.horario_visitas AS horario,
                    c.Total AS total,
                    c.Pagado AS pagado,
                    c.num_factura,
                    c.num_total_visitas,
                    c.observaciones,
                    tc.id_tarifa,
                    t.descripcion AS nombre_tarifa,
                    t.precio_base AS precio_tarifa
            FROM SWL.contratos c
            LEFT JOIN tarifas_contrato tc ON tc.id_contrato = c.id_contrato
            LEFT JOIN tarifas t ON t.id_tarifa = tc.id_tarifa
            WHERE c.id_cliente = :id_cliente
            ORDER BY c.id_contrato DESC;
        """)

        resultados = db.session.execute(sql_query, {"id_cliente": id_cliente}).fetchall()

        contratos = []
        for row in resultados:
            total = float(row.total or 0)
            pagado = float(row.pagado or 0)
            pendiente = round(total - pagado, 2)

            contratos.append({
                "id_contrato": row.id_contrato,
                "fecha_inicio": row.fecha_inicio.strftime("%d-%m-%Y") if row.fecha_inicio else None,
                "fecha_fin": row.fecha_fin.strftime("%d-%m-%Y") if row.fecha_fin else None,
                "visitas": row.visitas,
                "horario": row.horario,
                "id_tarifa": row.id_tarifa,
                "tarifa": row.nombre_tarifa,
                "precio_tarifa": float(row.precio_tarifa) if row.precio_tarifa is not None else None,
                "total": total,
                "pagado": pagado,
                "pendiente": pendiente,
                "num_factura": row.num_factura,
                "num_total_visitas": row.num_total_visitas,
                "observaciones": row.observaciones
            })

        return contratos
