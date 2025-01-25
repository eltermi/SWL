from extensions import db

class Animal(db.Model):
    __tablename__ = 'animales'
    id_animal = db.Column(db.Integer, primary_key=True)
    id_cliente = db.Column(db.Integer, db.ForeignKey('clientes.id_cliente'), nullable=False)
    tipo_animal = db.Column(db.String(50), nullable=False)
    nombre = db.Column(db.String(50), nullable=False)
    edad = db.Column(db.Integer)
    medicacion = db.Column(db.Text)
    foto = db.Column(db.LargeBinary)  # Para almacenar imágenes directamente en la base de datos

    cliente = db.relationship('Cliente', backref=db.backref('animales', lazy=True))

    def __repr__(self):
        return f'<Animal {self.nombre} ({self.tipo_animal})>'
