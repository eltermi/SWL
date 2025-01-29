import os

# Ruta donde está el archivo models.py
input_file = "models.py"
output_dir = "backend/models"

# Crear la carpeta si no existe
os.makedirs(output_dir, exist_ok=True)

with open(input_file, "r") as f:
    lines = f.readlines()

current_model = None
buffer = []

for line in lines:
    # Detectar el inicio de una clase modelo
    if line.startswith("class ") and "(Base)" in line:
        # Guardar la clase anterior en un archivo separado
        if current_model:
            with open(os.path.join(output_dir, f"{current_model}.py"), "w") as model_file:
                model_file.writelines(buffer)
            buffer = []

        # Extraer el nombre del modelo de la línea de clase
        current_model = line.split("class ")[1].split("(")[0].strip()

    buffer.append(line)

# Guardar la última clase
if current_model:
    with open(os.path.join(output_dir, f"{current_model}.py"), "w") as model_file:
        model_file.writelines(buffer)

print(f"Modelos divididos en archivos individuales en: {output_dir}")
