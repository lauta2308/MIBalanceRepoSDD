# Contrato: Supabase (datos y funciones RPC)

**Feature**: 001-cuenta-movimientos

Es la única interfaz entre la aplicación y los datos. Las pruebas de integración la usan
directamente, sin pasar por la interfaz (RNF-03). Los montos viajan **siempre como texto** con
punto decimal y sin separador de miles (`"1500.50"`).

## Lecturas

### `rpc('basp_obtener_cuenta')`

Sin parámetros. Devuelve una fila con la cuenta del usuario autenticado:

| Campo | Tipo JSON | Ejemplo |
|---|---|---|
| `id` | string (uuid) | |
| `nombre` | string | `"Mi Cuenta"` |
| `codigo_moneda` | string | `"USD"` |
| `saldo` | string | `"-1000.00"` |

### `from('bat_categorias').select('id, nombre, tipo, es_por_defecto')`

Categorías de la cuenta del usuario (RLS). El cliente las filtra por tipo y las ordena (R8).

### `from('bav_movimientos').select('*', { count: 'exact' })`

Lista paginada:

```text
.order('fecha', { ascending: false })
.order('creado_en', { ascending: false })
.order('id', { ascending: false })
.range(desde, desde + 49)
```

Cada fila: `id`, `tipo`, `monto` (texto), `fecha` (`"AAAA-MM-DD"`), `creado_en`, `id_categoria`,
`nombre_categoria`. `count` es el total de movimientos de la cuenta.

## Escrituras

Todas son funciones `SECURITY DEFINER`, atómicas, que operan solo sobre la cuenta de
`auth.uid()`. `p_tipo` ∈ `'INGRESO' | 'GASTO'`. `p_simular_falla` es solo para pruebas (research
R9): si es `true`, la función falla después de escribir el movimiento y antes de ajustar el saldo.

### `rpc('basp_agregar_movimiento', { p_tipo, p_monto, p_id_categoria, p_fecha, p_simular_falla? })`

Devuelve el `id` (uuid) del movimiento creado.

### `rpc('basp_editar_movimiento', { p_id_movimiento, p_tipo, p_monto, p_id_categoria, p_fecha, p_simular_falla? })`

Reemplaza tipo, monto, categoría y fecha. No cambia `creado_en`. Sin retorno.

### `rpc('basp_eliminar_movimiento', { p_id_movimiento, p_simular_falla? })`

Sin retorno.

## Errores

Las funciones lanzan excepciones con un código propio en el mensaje (`error.message`). El cliente
traduce el código a un texto para el usuario (`servicios/errores.js`) y **nunca** muestra el
mensaje técnico (FR-024, RNF-07).

| Código | Causa | Texto para el usuario |
|---|---|---|
| `MONTO_NO_POSITIVO` | monto nulo o ≤ 0 | "El monto debe ser mayor a 0." |
| `MONTO_MAXIMO` | monto > 999999999999.99 | "El monto máximo es 999.999.999.999,99." |
| `MONTO_DECIMALES` | más de 2 decimales | (no ocurre desde la interfaz) "No se pudo …" |
| `TIPO_INVALIDO` | tipo distinto de INGRESO/GASTO | "No se pudo …" |
| `CATEGORIA_INVALIDA` | categoría inexistente, de otra cuenta o de otro tipo | "No se pudo …" |
| `FECHA_INVALIDA` | fecha nula o posterior a mañana en UTC | "No se pudo …" |
| `MOVIMIENTO_INEXISTENTE` | id inexistente o de otro usuario | "No se pudo …" y se recarga la lista |
| `SIN_CUENTA` | usuario sin cuenta (no debería ocurrir) | "No se pudo …" |
| `FALLA_SIMULADA` | `p_simular_falla = true` | "No se pudo …" |
| cualquier otro / red | — | "No se pudo …" |

"No se pudo …" es el texto de FR-024 para la operación: "No se pudo registrar el gasto. Vuelva a
intentarlo.", "No se pudo registrar el ingreso. …", "No se pudo actualizar el movimiento. …" o
"No se pudo eliminar el movimiento. …".

## Accesos que deben fallar (RNF-03, FR-025, FR-034)

| Intento con la sesión de A | Resultado esperado |
|---|---|
| `select` de cuentas, categorías o movimientos de B (filtrando por sus ids) | 0 filas |
| `insert`/`update`/`delete` directo en cualquier `bat_*` | error de permisos |
| `basp_editar_movimiento` / `basp_eliminar_movimiento` con un movimiento de B | `MOVIMIENTO_INEXISTENTE` |
| `basp_agregar_movimiento` con una categoría de B | `CATEGORIA_INVALIDA` |
| `basp_agregar_movimiento` con una categoría propia de otro tipo | `CATEGORIA_INVALIDA` |
| cualquier llamada sin sesión (`anon`) | error de permisos |

## Sesión (temporal, hasta la feature 005)

`servicios/sesion.js` expone `ObtenerOIniciarSesion()`: devuelve la sesión guardada en el
navegador o crea una anónima (`signInAnonymously`). Si falla, la interfaz muestra FR-033.
