from werkzeug.security import generate_password_hash

def generar_hash_contraseña(contraseña):
    return generate_password_hash(contraseña)

if __name__ == "__main__":
    contraseña = input("Introduce la contraseña a hashear: ")
    hashed_password = generar_hash_contraseña(contraseña)
    print(f"Hash generado: {hashed_password}")

