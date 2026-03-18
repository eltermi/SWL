from typing import Optional, TYPE_CHECKING
from sqlalchemy import DECIMAL, Date, Enum, ForeignKeyConstraint, Index, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from extensions import db
import base64

if TYPE_CHECKING:
    from models.Clientes import Clientes

class Animales(db.Model):
    __tablename__ = 'animales'
    __table_args__ = (
        ForeignKeyConstraint(['id_cliente'], ['clientes.id_cliente'], ondelete='CASCADE', name='animales_ibfk_1'),
        Index('id_cliente', 'id_cliente')
    )

    id_animal: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo_animal: Mapped[str] = mapped_column(String(50))
    nombre: Mapped[str] = mapped_column(String(50))
    id_cliente: Mapped[Optional[int]] = mapped_column(Integer)
    sexo: Mapped[Optional[str]] = mapped_column(Enum('M', 'F'))
    edad: Mapped[Optional[int]] = mapped_column(Integer)
    medicacion: Mapped[Optional[str]] = mapped_column(Text)
    foto: Mapped[Optional[bytes]] = mapped_column(LONGBLOB)

    clientes: Mapped['Clientes'] = relationship('Clientes', back_populates='animales')

    @staticmethod
    def _detectar_mime_imagen(contenido):
        if not contenido:
            return "image/jpeg"
        if contenido.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if contenido.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if contenido.startswith(b"GIF87a") or contenido.startswith(b"GIF89a"):
            return "image/gif"
        if contenido.startswith(b"RIFF") and contenido[8:12] == b"WEBP":
            return "image/webp"
        if len(contenido) > 12 and contenido[4:8] == b"ftyp":
            marca = contenido[8:12]
            if marca in (b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1"):
                return "image/heic"
            if marca == b"avif":
                return "image/avif"
        return "image/jpeg"

    @classmethod
    def obtener_animal_cliente(cls, id_cliente):
        sql_query_cliente = text("""
    
                        SELECT id_animal, id_cliente, tipo_animal, nombre, sexo, edad, medicacion, foto
                          FROM ANIMALES
                         WHERE id_cliente = :id_cliente
        """)
        result = db.session.execute(sql_query_cliente, {"id_cliente": id_cliente})
        animales = []
        for row in result:
            foto_base64 = None
            mime = "image/jpeg"
            if row.foto:  # Si hay una imagen, la convertimos a Base64
                foto_base64 = base64.b64encode(row.foto).decode("utf-8")
                mime = cls._detectar_mime_imagen(row.foto)

            animales.append({
                "id_animal": row.id_animal,
                "id_cliente": row.id_cliente,
                "nombre_animal": row.nombre,
                "tipo_animal": row.tipo_animal,
                "sexo": row.sexo,
                "edad": row.edad,
                "medicacion": row.medicacion,
                "foto": f"data:{mime};base64,{foto_base64}" if foto_base64 else None  # Formato para HTML
            })

        return animales  # Retorna la lista de diccionarios
    
    @classmethod
    def obtener_animales(cls, filtro):
        sql_query_select = text("""
                SELECT 
                    a.id_animal,
                    a.id_cliente,
                    a.nombre AS nombre_animal,
                    c.nombre AS nombre_cliente,
                    c.apellidos AS apellidos_cliente,
                    a.tipo_animal,
                    a.sexo,
                    a.edad,
                    a.medicacion,
                    a.foto
                FROM SWL.animales a
                LEFT JOIN SWL.clientes c ON a.id_cliente = c.id_cliente
        """)

        if filtro:
            filtro = f"%{filtro}%"  # Añadir los % en Python
            sql_where = text("""
                WHERE c.nombre like :filtro
                    OR a.nombre like :filtro
            """)
            sql_query = text(f"{sql_query_select.text} {sql_where}")
            result = db.session.execute(sql_query, {"filtro": filtro})
        else:
            sql_query = text(f"{sql_query_select.text} ")
            result = db.session.execute(sql_query)

        animales = []
        for row in result:
            foto_base64 = None
            mime = "image/jpeg"
            if row.foto:  # Si hay una imagen, la convertimos a Base64
                foto_base64 = base64.b64encode(row.foto).decode("utf-8")
                mime = cls._detectar_mime_imagen(row.foto)

            animales.append({
                "id_animal": row.id_animal,
                "id_cliente": row.id_cliente,
                "nombre_animal": row.nombre_animal,
                "nombre_cliente": row.nombre_cliente,
                "apellidos_cliente": row.apellidos_cliente,
                "tipo_animal": row.tipo_animal,
                "sexo": row.sexo,
                "edad": row.edad,
                "medicacion": row.medicacion,
                "foto": f"data:{mime};base64,{foto_base64}" if foto_base64 else None  # Formato para HTML
            })

        return animales
