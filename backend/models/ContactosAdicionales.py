from typing import Optional, TYPE_CHECKING
from sqlalchemy import ForeignKeyConstraint, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from extensions import db

if TYPE_CHECKING:
    from models.Clientes import Clientes

class ContactosAdicionales(db.Model):
    __tablename__ = 'contactos_adicionales'
    __table_args__ = (
        ForeignKeyConstraint(['id_cliente'], ['clientes.id_cliente'], ondelete='CASCADE', name='contactos_adicionales_ibfk_1'),
        Index('id_cliente', 'id_cliente')
    )

    id_contacto: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50))
    apellidos: Mapped[str] = mapped_column(String(100))
    id_cliente: Mapped[Optional[int]] = mapped_column(Integer)
    telefono: Mapped[Optional[str]] = mapped_column(String(32))
    email: Mapped[Optional[str]] = mapped_column(String(100))

    clientes: Mapped['Clientes'] = relationship('Clientes', back_populates='contactos_adicionales')

    @classmethod
    def obtener_contactos(cls, filtro=""):
        sql_query = text("""
            SELECT
                ca.id_contacto,
                ca.id_cliente,
                ca.nombre,
                ca.apellidos,
                ca.telefono,
                ca.email,
                c.nombre AS nombre_cliente,
                c.apellidos AS apellidos_cliente
            FROM SWL.contactos_adicionales ca
            LEFT JOIN SWL.clientes c ON c.id_cliente = ca.id_cliente
            WHERE (
                :filtro_vacio = 1
                OR ca.nombre LIKE :filtro
                OR ca.apellidos LIKE :filtro
                OR ca.telefono LIKE :filtro
                OR ca.email LIKE :filtro
                OR c.nombre LIKE :filtro
                OR c.apellidos LIKE :filtro
            )
            ORDER BY c.nombre, c.apellidos, ca.id_contacto
        """)
        filtro_normalizado = f"%{filtro}%" if filtro else ""
        return db.session.execute(sql_query, {
            "filtro": filtro_normalizado,
            "filtro_vacio": 0 if filtro else 1
        })

    @classmethod
    def obtener_contactos_cliente(cls, id_cliente):
        sql_query = text("""
            SELECT
                ca.id_contacto,
                ca.id_cliente,
                ca.nombre,
                ca.apellidos,
                ca.telefono,
                ca.email
            FROM SWL.contactos_adicionales ca
            WHERE ca.id_cliente = :id_cliente
            ORDER BY ca.id_contacto
        """)
        return db.session.execute(sql_query, {"id_cliente": id_cliente}).fetchall()
