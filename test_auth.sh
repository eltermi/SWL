#!/bin/bash

# Configuración
BASE_URL="http://127.0.0.1:5001"
TOKEN=""

# === PRUEBAS DE REGISTRO ===
echo "=== PRUEBAS DE REGISTRO ==="

echo "Registrando un nuevo usuario..."
curl -X POST "$BASE_URL/registro" -H "Content-Type: application/json" -d '{
  "nombre": "María",
  "apellidos": "Pérez",
  "email": "maria@ejemplo.com",
  "password": "123456",
  "telefono": "123456789"
}'
echo -e "\n"

# === PRUEBAS DE LOGIN ===
echo "=== PRUEBAS DE LOGIN ==="

echo "Haciendo login con el usuario registrado..."
RESPONSE=$(curl -s -X POST "$BASE_URL/login" -H "Content-Type: application/json" -d '{
  "email": "maria@ejemplo.com",
  "password": "123456"
}')
echo $RESPONSE
TOKEN=$(echo $RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ]; then
  echo "ERROR: No se pudo obtener el token. Verifica el login."
  exit 1
fi
echo "Token obtenido: $TOKEN"
echo -e "\n"

# === PRUEBAS DE RUTAS PROTEGIDAS ===
echo "=== PRUEBAS DE RUTAS PROTEGIDAS ==="

echo "Accediendo a una ruta protegida SIN token..."
curl -X GET "$BASE_URL/clientes" -H "Content-Type: application/json"
echo -e "\n"

echo "Accediendo a una ruta protegida CON token válido..."
curl -X GET "$BASE_URL/clientes" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
echo -e "\n"

echo "Accediendo a una ruta protegida CON token inválido..."
curl -X GET "$BASE_URL/clientes" -H "Authorization: Bearer INVALIDO123" -H "Content-Type: application/json"
echo -e "\n"

echo "Pruebas completadas."
