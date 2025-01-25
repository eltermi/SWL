#!/bin/bash

# Base URL
BASE_URL="http://127.0.0.1:5001"

# === CLIENTES ===
echo "=== PRUEBAS: CLIENTES ==="

# GET /clientes
echo "Obteniendo todos los clientes..."
curl -X GET "$BASE_URL/clientes" -H "Content-Type: application/json"
echo -e "\n"

# POST /clientes
echo "Creando un nuevo cliente..."
curl -X POST "$BASE_URL/clientes" -H "Content-Type: application/json" -d '{
  "nombre": "Juan",
  "apellidos": "García",
  "email": "juan@ejemplo.com",
  "telefono": "123456789"
}'
echo -e "\n"

# GET /clientes/{id_cliente}
echo "Obteniendo cliente con ID 1..."
curl -X GET "$BASE_URL/clientes/1" -H "Content-Type: application/json"
echo -e "\n"

# PUT /clientes/{id_cliente}
echo "Actualizando cliente con ID 1..."
curl -X PUT "$BASE_URL/clientes/1" -H "Content-Type: application/json" -d '{
  "nombre": "Juan Actualizado",
  "apellidos": "García Actualizado",
  "email": "juan.actualizado@ejemplo.com",
  "telefono": "987654321"
}'
echo -e "\n"

# DELETE /clientes/{id_cliente}
echo "Eliminando cliente con ID 1..."
curl -X DELETE "$BASE_URL/clientes/1" -H "Content-Type: application/json"
echo -e "\n"

# === ANIMALES ===
echo "=== PRUEBAS: ANIMALES ==="

# GET /animales
echo "Obteniendo todos los animales..."
curl -X GET "$BASE_URL/animales" -H "Content-Type: application/json"
echo -e "\n"

# POST /animales
echo "Creando un nuevo animal..."
curl -X POST "$BASE_URL/animales" -H "Content-Type: application/json" -d '{
  "id_cliente": 2,
  "tipo_animal": "Gato",
  "nombre": "Mimi",
  "edad": 3,
  "medicacion": "Ninguna"
}'
echo -e "\n"

# GET /animales/{id_animal}
echo "Obteniendo animal con ID 1..."
curl -X GET "$BASE_URL/animales/1" -H "Content-Type: application/json"
echo -e "\n"

# PUT /animales/{id_animal}
echo "Actualizando animal con ID 1..."
curl -X PUT "$BASE_URL/animales/1" -H "Content-Type: application/json" -d '{
  "tipo_animal": "Perro",
  "nombre": "Max",
  "edad": 5,
  "medicacion": "Vitaminas"
}'
echo -e "\n"

# DELETE /animales/{id_animal}
echo "Eliminando animal con ID 1..."
curl -X DELETE "$BASE_URL/animales/1" -H "Content-Type: application/json"
echo -e "\n"

# === CONTRATOS ===
echo "=== PRUEBAS: CONTRATOS ==="

# GET /contratos
echo "Obteniendo todos los contratos..."
curl -X GET "$BASE_URL/contratos" -H "Content-Type: application/json"
echo -e "\n"

# POST /contratos
echo "Creando un nuevo contrato..."
curl -X POST "$BASE_URL/contratos" -H "Content-Type: application/json" -d '{
  "id_cliente": 2,
  "fecha_inicio": "2025-02-01",
  "fecha_fin": "2025-02-15",
  "numero_visitas_diarias": 1,
  "horario_visitas": "08:00",
  "pago_adelantado": 50.0,
  "estado_pago_adelantado": "Pendiente",
  "pago_final": 50.0,
  "estado_pago_final": "Pendiente"
}'
echo -e "\n"

# GET /contratos/{id_contrato}
echo "Obteniendo contrato con ID 1..."
curl -X GET "$BASE_URL/contratos/1" -H "Content-Type: application/json"
echo -e "\n"

# PUT /contratos/{id_contrato}
echo "Actualizando contrato con ID 1..."
curl -X PUT "$BASE_URL/contratos/1" -H "Content-Type: application/json" -d '{
  "numero_visitas_diarias": 2,
  "horario_visitas": "09:00,18:00",
  "estado_pago_final": "Pagado"
}'
echo -e "\n"

# DELETE /contratos/{id_contrato}
echo "Eliminando contrato con ID 1..."
curl -X DELETE "$BASE_URL/contratos/1" -H "Content-Type: application/json"
echo -e "\n"

echo "Pruebas finalizadas."
