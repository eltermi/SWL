from extensions import db

class Cliente(db.Model):
    __tablename__ = 'clientes'
    id_cliente = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False)
    apellidos = db.Column(db.String(100), nullable=False)
    calle = db.Column(db.String(100))
    piso = db.Column(db.String(10))
    codigo_postal = db.Column(db.String(10))
    municipio = db.Column(db.String(50))
    pais = db.Column(db.String(50))
    telefono = db.Column(db.String(15))
    email = db.Column(db.String(100))
    nacionalidad = db.Column(db.String(50))
    idioma = db.Column(db.String(50))
    genero = db.Column(db.Enum('M', 'F'))
    referencia_origen = db.Column(db.String(50))

    def __repr__(self):
        return f'<Cliente {self.nombre} {self.apellidos}>'
