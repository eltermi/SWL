from werkzeug.security import generate_password_hash

def generar_hash_contraseña(contraseña):
    return generate_password_hash(contraseña)

if __name__ == "__main__":
    contraseña = input("Introduce la contraseña a hashear: ")
    hashed_password = generar_hash_contraseña(contraseña)
    print(f"Hash generado: {hashed_password}")

# source venv/bin/activate  # Si aún no has activado el entorno
# python backend/generar_hash.py
# Introduce la contraseña cuando te lo pida y copia el hash generado.
# Inserta el usuario en la base de datos usando el hash: