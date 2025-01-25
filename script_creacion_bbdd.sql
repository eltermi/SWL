CREATE DATABASE IF NOT EXISTS SWL;
USE SWL;

-- Tabla de clientes
CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    calle VARCHAR(100),
    piso VARCHAR(10),
    codigo_postal VARCHAR(5),
    municipio VARCHAR(50),
    pais VARCHAR(50),
    telefono VARCHAR(15),
    email VARCHAR(100),
    nacionalidad VARCHAR(50),
    idioma VARCHAR(50),
    genero ENUM('M', 'F'),
    referencia_origen VARCHAR(50) -- Indica de dónde proviene el cliente (Facebook, amistad, anuncio, etc.)
);

-- Tabla de contactos adicionales
CREATE TABLE contactos_adicionales (
    id_contacto INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    nombre VARCHAR(50) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(15),
    email VARCHAR(100),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE
);

-- Tabla de animales
CREATE TABLE animales (
    id_animal INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    tipo_animal VARCHAR(50) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    edad INT,
    medicacion TEXT,
    foto LONGBLOB, -- Guarda la foto del animal para identificación rápida
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE
);

-- Tabla de contratos
CREATE TABLE contratos (
    id_contrato INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    numero_visitas_diarias INT NOT NULL,
    horario_visitas JSON NOT NULL, -- Almacena las horas solicitadas como un array de tiempos (ejemplo: '["09:00", "19:00"]')
    pago_adelantado DECIMAL(10, 2) NOT NULL,
    estado_pago_adelantado ENUM('Pendiente', 'Pagado') DEFAULT 'Pendiente', -- Estado del pago adelantado
    pago_final DECIMAL(10, 2) NOT NULL,
    estado_pago_final ENUM('Pendiente', 'Pagado') DEFAULT 'Pendiente', -- Estado del pago final
    observaciones TEXT,
    factura LONGBLOB, -- Guarda el documento de facturación.
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE
);

-- Tabla de tarifas
CREATE TABLE tarifas (
    id_tarifa INT AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL,
    precio_base DECIMAL(10, 2) NOT NULL,
    descuento_por_visita DECIMAL(10, 2),
    tarifa_adicional_por_animal DECIMAL(10, 2)
);

-- Tabla de detalles de tarifas por contrato
CREATE TABLE tarifas_contrato (
    id_tarifa_contrato INT AUTO_INCREMENT PRIMARY KEY,
    id_contrato INT,
    id_tarifa INT,
    FOREIGN KEY (id_contrato) REFERENCES contratos(id_contrato) ON DELETE CASCADE,
    FOREIGN KEY (id_tarifa) REFERENCES tarifas(id_tarifa) ON DELETE CASCADE
);

-- Tabla para almacenar usuarios autorizados
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'user') DEFAULT 'user'
);