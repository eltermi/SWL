from extensions import db

class Contrato(db.Model):
    __tablename__ = 'contratos'
    id_contrato = db.Column(db.Integer, primary_key=True)
    id_cliente = db.Column(db.Integer, db.ForeignKey('clientes.id_cliente'), nullable=False)
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=False)
    numero_visitas_diarias = db.Column(db.Integer, nullable=False)
    horario_visitas = db.Column(db.JSON, nullable=False)  # Almacenar horarios como JSON
    pago_adelantado = db.Column(db.Float, nullable=False)
    estado_pago_adelantado = db.Column(db.Enum('Pendiente', 'Pagado'), default='Pendiente')
    pago_final = db.Column(db.Float, nullable=False)
    estado_pago_final = db.Column(db.Enum('Pendiente', 'Pagado'), default='Pendiente')

    cliente = db.relationship('Cliente', backref=db.backref('contratos', lazy=True))

    def __repr__(self):
        return f'<Contrato {self.id_contrato} - Cliente {self.id_cliente}>'
