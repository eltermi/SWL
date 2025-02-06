import os
import sys

def cargar_configuracion(config_path):
    """
    Carga el archivo de configuración y devuelve una lista con los nombres de los directorios a ignorar.
    Se omiten líneas vacías y aquellas que comienzan con '#'.
    """
    ignore_dirs = []
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            for line in f:
                linea = line.strip()
                if linea and not linea.startswith("#"):
                    ignore_dirs.append(linea)
    except Exception as e:
        print(f"Error al leer el archivo de configuración: {e}")
    return ignore_dirs

def escribir_estructura(root_path, out, ignore_dirs, archivo_salida_abs):
    """
    Escribe en el archivo 'out' una representación de la estructura de directorios y archivos,
    recorriendo recursivamente 'root_path'. Se ordena alfabéticamente y se ignoran:
      - los directorios listados en 'ignore_dirs'
      - el archivo de salida, cuyo path absoluto se pasa en 'archivo_salida_abs'
    """
    out.write("Representación de la estructura de directorios:\n\n")
    
    for root, dirs, files in os.walk(root_path):
        # Filtrar los directorios a ignorar.
        dirs[:] = sorted([d for d in dirs if d not in ignore_dirs])
        files = sorted(files)
        # Filtrar el archivo de salida (compara las rutas absolutas)
        files = [f for f in files if os.path.abspath(os.path.join(root, f)) != archivo_salida_abs]
        
        # Calcular el nivel de indentación en función de la profundidad relativa.
        nivel = root[len(root_path):].count(os.sep)
        indent = '    ' * nivel
        
        nombre_dir = os.path.basename(root) if os.path.basename(root) else root
        out.write(f"{indent}Directorio: {nombre_dir}\n")
        
        for archivo in files:
            out.write(f"{indent}    Archivo: {archivo}\n")
    
    # Separador entre la representación de la estructura y el contenido de archivos.
    out.write("\n" + "=" * 40 + "\n\n")

def escribir_contenido_archivos(root_path, out, ignore_dirs, archivo_salida_abs):
    """
    Recorre recursivamente 'root_path' y, para cada archivo (ordenados alfabéticamente),
    escribe en 'out' su ruta y contenido. Se ignoran:
      - los directorios listados en 'ignore_dirs'
      - el archivo de salida.
    Cada archivo se separa del siguiente con:
      - una línea en blanco,
      - una línea compuesta de guiones,
      - dos líneas en blanco.
    """
    out.write("Contenido de los archivos:\n\n")
    
    for root, dirs, files in os.walk(root_path):
        dirs[:] = sorted([d for d in dirs if d not in ignore_dirs])
        files = sorted(files)
        files = [f for f in files if os.path.abspath(os.path.join(root, f)) != archivo_salida_abs]
        
        for archivo in files:
            ruta_archivo = os.path.join(root, archivo)
            out.write(f"Archivo: {ruta_archivo}\n")
            try:
                with open(ruta_archivo, 'r', encoding='utf-8') as f:
                    contenido = f.read()
                out.write(contenido)
            except Exception as e:
                out.write(f"Error al leer el archivo: {e}")
            
            # Separación: una línea en blanco, una línea de guiones y dos líneas en blanco.
            out.write("\n")
            out.write("-" * 40 + "\n")
            out.write("\n\n")

if __name__ == "__main__":
    # Uso: python script.py <directorio_raiz> <archivo_salida> [archivo_configuracion]
    if len(sys.argv) < 3:
        print("Uso: python script.py <directorio_raiz> <archivo_salida> [archivo_configuracion]")
        sys.exit(1)
    
    directorio_raiz = sys.argv[1]
    archivo_salida = sys.argv[2]
    archivo_salida_abs = os.path.abspath(archivo_salida)  # Ruta absoluta del archivo de salida.
    
    # Si se proporciona un archivo de configuración, se carga la lista de directorios a ignorar.
    ignore_dirs = []
    if len(sys.argv) >= 4:
        config_file = sys.argv[3]
        ignore_dirs = cargar_configuracion(config_file)
    
    with open(archivo_salida, 'w', encoding='utf-8') as out:
        escribir_estructura(directorio_raiz, out, ignore_dirs, archivo_salida_abs)
        escribir_contenido_archivos(directorio_raiz, out, ignore_dirs, archivo_salida_abs)
    
    print(f"Proceso completado. La salida se guardó en: {archivo_salida}")

