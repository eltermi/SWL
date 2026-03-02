# Especificación Funcional y Reglas de Negocio (extraída del backend)

Base analizada: código en `backend/` + esquema SQL proporcionado.

Criterio aplicado:
- Solo se documenta comportamiento implementado.
- Se separa explícito vs implícito.
- Se indican incoherencias y ambigüedades cuando existen.

## 1. Lista completa de entidades

1. `clientes`
- Identificador: `id_cliente`.
- Datos personales y de contacto: `nombre`, `apellidos`, `calle`, `piso`, `codigo_postal`, `municipio`, `pais`, `telefono`, `email`, `nacionalidad`, `idioma`, `genero`, `referencia_origen`.

2. `animales`
- Identificador: `id_animal`.
- Vinculación a cliente: `id_cliente`.
- Datos: `tipo_animal`, `nombre`, `edad`, `medicacion`, `foto`.

3. `contactos_adicionales`
- Identificador: `id_contacto`.
- Vinculación a cliente: `id_cliente`.
- Datos: `nombre`, `apellidos`, `telefono`, `email`.

4. `contratos`
- Identificador: `id_contrato`.
- Vinculación a cliente: `id_cliente`.
- Datos de servicio: `fecha_inicio`, `fecha_fin`, `numero_visitas_diarias`, `horario_visitas` (JSON), `num_total_visitas`.
- Datos económicos: `Total`, `Pagado`, `num_factura`.
- Otros: `observaciones`.

5. `tarifas`
- Identificador: `id_tarifa`.
- Datos económicos: `descripcion`, `precio_base`, `descuento_por_visita`, `tarifa_adicional_por_animal`.

6. `tarifas_contrato`
- Identificador: `id_tarifa_contrato`.
- Relación: `id_contrato` + `id_tarifa`.

7. `usuarios`
- Identificador: `id_usuario`.
- Autenticación/autorización: `username`, `password_hash`, `rol` (`admin`/`user`).

## 2. Relaciones entre entidades (cardinalidades)

1. `clientes (1) -> (N) animales`
- FK: `animales.id_cliente -> clientes.id_cliente`.
- `ON DELETE CASCADE`.

2. `clientes (1) -> (N) contactos_adicionales`
- FK: `contactos_adicionales.id_cliente -> clientes.id_cliente`.
- `ON DELETE CASCADE`.

3. `clientes (1) -> (N) contratos`
- FK: `contratos.id_cliente -> clientes.id_cliente`.
- `ON DELETE CASCADE`.

4. `contratos (N) <-> (N) tarifas` vía `tarifas_contrato`
- FK: `tarifas_contrato.id_contrato -> contratos.id_contrato`.
- FK: `tarifas_contrato.id_tarifa -> tarifas.id_tarifa`.
- Ambas con `ON DELETE CASCADE`.

Observación funcional:
- En práctica de negocio implementada, al crear contrato se inserta una sola fila en `tarifas_contrato` (una tarifa activa por contrato), pero la estructura permite varias.

## 3. Reglas de negocio explícitas implementadas en código

### 3.1 Autenticación
1. Casi todos los endpoints de negocio requieren JWT en cabecera `Authorization: Bearer <token>`.
2. El token se firma con `HS256` y `JWT_SECRET_KEY` obligatorio en entorno.
3. Expiración por defecto del token: 60 minutos.
4. `POST /api/login` autentica contra `usuarios.username` + `password_hash`.

### 3.2 Clientes
1. Alta y edición normalizan `telefono`.
2. Si el teléfono no tiene dígitos o excede 32 caracteres tras normalizar, se rechaza con 400.
3. Búsqueda de clientes (`/api/clientes?buscar=`) aplica `LIKE` sobre:
- `clientes.nombre`
- `clientes.municipio`
- `clientes.apellidos`
- `animales.nombre`
- `contactos_adicionales.nombre`
4. El listado de clientes concatena nombres de animales en formato natural (`a, b y c`).

### 3.3 Animales
1. Alta de animal acepta foto binaria (`multipart/form-data`) y la guarda en BLOB.
2. Respuestas de listados convierten foto a `data:image/jpeg;base64,...` cuando existe.
3. Filtrado de animales (`/api/animales?buscar=`) por nombre de cliente o nombre de animal.

### 3.4 Contratos
1. En creación, `id_tarifa` debe ser entero válido y existir.
2. En creación, `num_total_visitas` es obligatorio (si falta o vacío => error 400).
3. En creación, `total` se calcula siempre como:
- `num_total_visitas * tarifa.precio_base`.
4. En creación, `pagado` vacío/nulo se interpreta como `0.00`.
5. En creación, se genera `num_factura = "<id_contrato>-<id_cliente>"` tras `flush`.
6. En actualización, si llega `id_tarifa`:
- Debe ser entero válido.
- Debe existir tarifa.
- Se actualiza/crea vínculo en `tarifas_contrato`.
7. En actualización, cálculo de `total` sigue prioridad:
- Si hay tarifa disponible (`id_tarifa` nueva o existente): `num_total_visitas * precio_base`.
- Si no hay tarifa y llega `total`: se usa `total` validado.
- Si no hay tarifa ni `total`: se recalcula como días*visitas_diarias.
8. En actualización, `pagado` solo cambia si viene en payload.
9. Contratos "activos" para dashboard: por cada día de ventana de 8 días (`hoy` a `hoy+7`), se incluyen contratos con `fecha_inicio <= día <= fecha_fin`.
10. Contratos "programados" (`/dashboard/contratos_programados`) incluyen todos los contratos con `fecha_fin >= hoy` (incluye activos y futuros).

### 3.5 Usuarios
1. Alta de usuario requiere autenticación previa.
2. La contraseña recibida se hashea antes de persistir.
3. `username` es único en BD.

## 4. Reglas implícitas detectadas

1. Un cliente puede existir sin animales, sin contactos y sin contratos.
2. Un animal/contacto/contrato puede quedar sin padre lógico solo si `id_cliente` fuese `NULL` (la columna permite `NULL`), pero si tiene FK válida y se borra cliente, se borra por cascada.
3. El campo `num_total_visitas` es tratado como dato editable de negocio (no exclusivamente derivado).
4. `pagado` puede superar `total`; no hay regla que lo prohíba.
5. La tarifa de un contrato se trata como motor principal de cálculo cuando está presente.
6. La app usa formato de fecha `%Y-%m-%d` para parseo interno en cálculos.
7. La lista de contratos de cliente ordena por contrato más reciente (`id_contrato DESC`).
8. El campo `horario_visitas` no tiene validación estructural (solo se guarda JSON recibido).

## 5. Cálculos y fórmulas exactas

1. `calcular_total_contrato(fecha_inicio, fecha_fin, numero_visitas_diarias)`
- `dias = (fecha_fin - fecha_inicio).days + 1`
- `total = Decimal(dias * int(numero_visitas_diarias)).quantize(0.01)`
- Restricciones en función:
- `fecha_fin >= fecha_inicio`
- `numero_visitas_diarias >= 0`

2. `calcular_num_total_visitas_desde_fechas(fecha_inicio, fecha_fin, numero_visitas_diarias)`
- `dias = (fecha_fin - fecha_inicio).days + 1`
- `num_total_visitas = Decimal(dias) * Decimal(numero_visitas_diarias)`
- Restricciones:
- `fecha_fin >= fecha_inicio`
- `numero_visitas_diarias >= 0`

3. `calcular_total_desde_visitas_y_tarifa(num_total_visitas, id_tarifa)`
- Busca tarifa por `id_tarifa`.
- `total = (Decimal(num_total_visitas) * Decimal(tarifa.precio_base)).quantize(0.01)`
- Si no existe tarifa => error.

4. `parsear_pagado(valor)`
- `None` o vacío => `0.00`.
- Reemplaza coma por punto.
- Convierte a `Decimal(...).quantize(0.01)`.
- No impide valores negativos.

5. `parsear_total(valor)`
- `None` o vacío => error.
- Convierte a decimal con 2 decimales.
- Rechaza negativos.

6. `parsear_num_total_visitas(valor)`
- `None` o vacío => error.
- Convierte a decimal (sin redondeo fijo).
- Rechaza negativos.

7. `formatear_num_total_visitas(numero)`
- Convierte decimal a string sin ceros finales ni punto final.
- Ejemplos efectivos: `2.00 -> "2"`, `2.50 -> "2.5"`.

8. Saldo pendiente en lecturas de contrato:
- `pendiente = round(total - pagado, 2)`

## 6. Validaciones obligatorias

### 6.1 Validaciones por código de aplicación
1. JWT obligatorio en endpoints protegidos.
2. Formato de cabecera `Authorization` debe empezar por `Bearer `.
3. Teléfono:
- Limpieza de caracteres invisibles/control.
- Conserva `+` inicial si estaba.
- Debe tener dígitos.
- Máximo 32 caracteres finales.
4. Contratos:
- `id_tarifa` entero válido cuando se usa.
- Tarifa debe existir para cálculo por tarifa.
- `num_total_visitas` no vacío y no negativo cuando se parsea.
- `total` no negativo cuando se parsea manualmente.
- `fecha_fin >= fecha_inicio` en cálculos dependientes de fechas.
5. Login:
- `username` y `password` requeridos.

### 6.2 Validaciones por BD
1. PK en todas las tablas.
2. `usuarios.username` único.
3. FKs con cascada en relaciones principales.
4. No nulos relevantes:
- `clientes.nombre`
- `contactos_adicionales.nombre`
- `contratos.fecha_inicio`
- `contratos.fecha_fin`
- `contratos.numero_visitas_diarias`
- `contratos.horario_visitas`
- `contratos.Total`
- `contratos.Pagado`
- `tarifas.descripcion`
- `tarifas.precio_base`
- `usuarios.username`
- `usuarios.password_hash`

## 7. Estados posibles de cada entidad

1. `clientes`
- No hay campo de estado.
- Estados funcionales inferibles: existente / eliminado.

2. `animales`
- No hay campo de estado.
- Estados funcionales: existente / eliminado.

3. `contactos_adicionales`
- No hay campo de estado.
- Estados funcionales: existente / eliminado.

4. `contratos`
- No hay campo `estado`, pero hay estados derivados por fechas:
- `activo` si `fecha_inicio <= fecha_referencia <= fecha_fin`.
- `futuro` si `fecha_inicio > fecha_referencia`.
- `finalizado` si `fecha_fin < fecha_referencia`.
- Estado de cobro derivado (no persistido):
- `pendiente > 0` (saldo pendiente)
- `pendiente = 0` (pagado exacto)
- `pendiente < 0` (sobrepagado)

5. `tarifas`
- Sin estado; toda tarifa existente es potencialmente utilizable.

6. `tarifas_contrato`
- Sin estado; existente / eliminado.

7. `usuarios`
- Sin campo activo/inactivo.
- Estado operativo depende de existencia y credenciales válidas.
- Rol: `admin` o `user`.

## 8. Restricciones importantes

1. Dependencia obligatoria para cálculo tarifado:
- Para calcular por precio base, debe existir tarifa vinculada o enviada.

2. Dependencia obligatoria de integridad referencial:
- `id_cliente` de `animales`, `contactos_adicionales`, `contratos` debe referenciar cliente válido cuando no es `NULL`.

3. Dependencia implícita de datos para crear contrato:
- El código espera `id_cliente`, fechas, visitas diarias, `id_tarifa`, `num_total_visitas`.

4. Restricción de sesión JWT:
- Sin token válido, endpoints protegidos devuelven 401.

5. Restricción de unicidad:
- No puede haber dos usuarios con el mismo `username`.

## 9. Casos límite contemplados en el código

1. Teléfono con unicode invisible/bidi y espacios no estándar: se limpia correctamente.
2. Teléfono vacío o `None`: se guarda como `NULL`.
3. Teléfono excesivamente largo: rechazo con mensaje específico.
4. `num_total_visitas` inválido o vacío: rechazo 400.
5. `total` inválido o negativo (en parseo manual): rechazo 400.
6. `fecha_fin < fecha_inicio` en funciones de cálculo: rechazo.
7. Tarifa inexistente en alta/edición de contrato: rechazo.
8. Token ausente/formato incorrecto/token inválido o expirado: 401.
9. Fotos de animal opcionales: se admiten nulas.
10. Manejo de `DataError`/`IntegrityError` en varias rutas con mensaje funcional.

## 10. Casos NO contemplados (vacíos funcionales)

1. No existe validación de coherencia entre `num_total_visitas` y (`fecha_inicio`, `fecha_fin`, `numero_visitas_diarias`) al crear contrato.
2. No existe regla para impedir `pagado < 0`.
3. No existe regla para impedir `pagado > total`.
4. No existe validación de formato/estructura de `horario_visitas`.
5. No existe validación de rangos de `edad` de animal (p. ej. negativos).
6. No existe control de tipo de archivo/tamaño de foto.
7. No existe control de duplicados de animales/contactos por cliente.
8. No existe manejo explícito de 404 en `GET /clientes/<id>` cuando consulta SQL no devuelve fila (puede terminar en error 500).
9. No hay control transaccional defensivo en algunos POST simples (`contactos`, `tarifas_contrato`, `usuarios`) ante errores de persistencia.
10. No hay control de autorización por rol (`admin`/`user`): solo autenticación.
11. No hay invalidación/revocación de tokens.
12. No hay lógica aplicada para `descuento_por_visita` ni `tarifa_adicional_por_animal` en ningún cálculo.
13. No hay unicidad sobre `tarifas_contrato` para evitar múltiples tarifas por contrato.
14. No hay validación de consistencia entre token de cabecera y token en body en `/dashboard/usuario`.

## Incoherencias detectadas

1. Registro de auth inconsistente con modelo real:
- `POST /api/registro` crea en tabla/modelo `Clientes` e intenta asignar `password_hash`, pero `Clientes` no define ese campo.
- Además, el login real usa `Usuarios`, no `Clientes`.

2. Doble mecanismo de token en dashboard:
- `/api/dashboard/usuario` exige JWT por decorador y además exige otro token en body para volver a verificar.

3. Cálculo de `total` no uniforme:
- Alta contrato: siempre por tarifa (`num_total_visitas * precio_base`).
- Edición sin tarifa: puede recalcularse como días*visitas_diarias.
- Esto puede producir totales distintos para el mismo contrato según flujo.

4. Campos tarifarios no utilizados:
- `descuento_por_visita` y `tarifa_adicional_por_animal` existen en modelo/BD, pero no participan en cálculos.

5. Semántica de endpoint "programados":
- Incluye activos y futuros (`fecha_fin >= hoy`), no solo futuros.

## Ambigüedades funcionales

1. `num_total_visitas` está modelado como `varchar(45)` y se maneja como decimal/string; no queda fijado si el negocio permite fracciones de visita.
2. No se explicita si un contrato debe tener exactamente una tarifa o puede tener varias históricas/simultáneas.
3. No se explicita si el rol de usuario debe influir en permisos de escritura/borrado.
4. No se define el formato contractual esperado de `horario_visitas` (diccionario libre actualmente).
