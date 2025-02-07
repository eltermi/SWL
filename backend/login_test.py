from werkzeug.security import check_password_hash

class LoginTest:
    def __init__(self):
        # Aquí puedes hardcodear el hash de la contraseña generada previamente
        self.hashed_password = "scrypt:32768:8:1$rvH9uh8J5qY9GR6j$98050067122c8b689788f4a00cd9a300055317b38835eeac2f3c3311292fe5c1cb3cdc2d0386834f2598190f1b1dc428321f5ec5c8d35948d81ba61b826b983c"
    
    def verificar_contraseña(self, contraseña):
        if check_password_hash(self.hashed_password, contraseña):
            print("✅ Contraseña correcta. Acceso permitido.")
        else:
            print("❌ Contraseña incorrecta. Acceso denegado.")

if __name__ == "__main__":
    login = LoginTest()
    contraseña_ingresada = input("Introduce la contraseña para verificar: ")
    login.verificar_contraseña(contraseña_ingresada)
