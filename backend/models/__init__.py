from sqlalchemy.orm import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Definir la base para los modelos
Base = declarative_base()

# Crear motor de la base de datos (ajusta la URL según tu configuración)
DATABASE_URL = "mysql+pymysql://sitters:gatos@localhost/SWL"

engine = create_engine(DATABASE_URL, echo=True)  # Cambia 'echo' a False en producción

# Crear sesión de la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Importar todos los modelos para que SQLAlchemy los reconozca
from models.Animales import Animales
from models.Clientes import Clientes  
from models.ContactosAdicionales import ContactosAdicionales
from models.Contratos import Contratos
from models.Tarifas import Tarifas
from models.TarifasContrato import TarifasContrato
from models.Usuarios import Usuarios