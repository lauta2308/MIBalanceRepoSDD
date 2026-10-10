# Data Model: Cuenta y Movimientos

**Feature**: 001-cuenta-movimientos | **Date**: 2026-10-10

Nombres según AGENTS.md: en el SQL van en mayúsculas y sin comillas; desde supabase-js se usan en
minúsculas. Los usuarios viven en `auth.users`; no hay `BAT_USUARIOS`.

## Diagrama

```text
auth.users 1 ── 1 BAT_CUENTAS 1 ── * BAT_CATEGORIAS
                       │                  │
                       1                  1
                       └── * BAT_MOVIMIENTOS *┘   (misma cuenta y mismo tipo)
```

## BAT_CUENTAS

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `uuid` | PK `BAPK_CUENTAS`, `DEFAULT gen_random_uuid()` |
| `id_usuario` | `uuid` | FK `BAFK_CUENTAS_USUARIO` → `auth.users(id)` `ON DELETE CASCADE`; único `BAUQ_CUENTAS_USUARIO` (una cuenta por usuario) |
| `nombre` | `varchar(30)` | `NOT NULL DEFAULT 'Mi Cuenta'`; `BACK_CUENTAS_NOMBRE_VALIDO`: `nombre = btrim(nombre) AND nombre <> ''` |
| `codigo_moneda` | `char(3)` | `NOT NULL DEFAULT 'USD'`; `BACK_CUENTAS_CODIGO_MONEDA`: `~ '^[A-Z]{3}$'` (la FK a la lista ISO llega en 003) |
| `saldo` | `numeric` | `NOT NULL DEFAULT 0`; sin precisión fija (sin tope); `BACK_CUENTAS_SALDO_DOS_DECIMALES`: `saldo = round(saldo, 2)` |
| `creado_en` | `timestamptz` | `NOT NULL DEFAULT now()` |

- **Invariante** (FR-004): `saldo = Σ monto (INGRESO) − Σ monto (GASTO)` de sus movimientos.
- **Escritura**: solo el trigger de alta de usuario y las funciones `BASP_*`. El cliente no tiene
  permiso de `INSERT`, `UPDATE` ni `DELETE` (FR-034).

## BAT_CATEGORIAS

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `uuid` | PK `BAPK_CATEGORIAS` |
| `id_cuenta` | `uuid` | FK `BAFK_CATEGORIAS_CUENTA` → `BAT_CUENTAS(id)` `ON DELETE CASCADE` |
| `nombre` | `varchar(30)` | `NOT NULL`; `BACK_CATEGORIAS_NOMBRE_VALIDO`: `nombre = btrim(nombre) AND nombre <> ''` |
| `tipo` | `text` | `NOT NULL`; `BACK_CATEGORIAS_TIPO`: `IN ('INGRESO', 'GASTO')` |
| `es_por_defecto` | `boolean` | `NOT NULL DEFAULT false` |
| `creado_en` | `timestamptz` | `NOT NULL DEFAULT now()` |

- `BAUQ_CATEGORIAS_ID_CUENTA_TIPO`: único `(id, id_cuenta, tipo)`, destino de la FK compuesta
  de movimientos.
- `BAIX_CATEGORIAS_POR_DEFECTO`: índice único parcial `(id_cuenta, tipo) WHERE es_por_defecto`
  (exactamente una por defecto por tipo).
- Por defecto: "Pago Realizado" (`GASTO`) y "Pago Ingresado" (`INGRESO`), creadas con la cuenta.
  No se pueden editar ni eliminar (FR-028): el cliente no tiene permisos de escritura y la
  feature 002 agregará funciones que excluyan `es_por_defecto`.
- La unicidad de nombre por tipo (RF-79) llega en la feature 002, junto con el alta de categorías.

## BAT_MOVIMIENTOS

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `uuid` | PK `BAPK_MOVIMIENTOS` |
| `id_cuenta` | `uuid` | `NOT NULL`; FK `BAFK_MOVIMIENTOS_CUENTA` → `BAT_CUENTAS(id)` `ON DELETE CASCADE` |
| `id_categoria` | `uuid` | `NOT NULL` |
| `tipo` | `text` | `NOT NULL`; `BACK_MOVIMIENTOS_TIPO`: `IN ('INGRESO', 'GASTO')` |
| `monto` | `numeric(14,2)` | `NOT NULL`; `BACK_MOVIMIENTOS_MONTO_POSITIVO`: `> 0`; `BACK_MOVIMIENTOS_MONTO_MAXIMO`: `<= 999999999999.99` |
| `fecha` | `date` | `NOT NULL` (día calendario, sin hora ni zona horaria) |
| `creado_en` | `timestamptz` | `NOT NULL DEFAULT clock_timestamp()`; nunca se modifica |

- `BAFK_MOVIMIENTOS_CATEGORIA`: FK compuesta `(id_categoria, id_cuenta, tipo)` →
  `BAT_CATEGORIAS(id, id_cuenta, tipo)` `ON UPDATE RESTRICT ON DELETE RESTRICT`. Garantiza que la
  categoría es de la misma cuenta y del mismo tipo, y que una categoría con movimientos no puede
  borrarse ni cambiar de tipo (útil para RF-81/RF-83 en 002).
- `BAIX_MOVIMIENTOS_CUENTA_FECHA`: `(id_cuenta, fecha DESC, creado_en DESC, id DESC)`, para la
  lista paginada.
- `BAIX_MOVIMIENTOS_CATEGORIA`: `(id_categoria)`, para la FK.
- La fecha futura no se valida con un CHECK (dependería del reloj); la validan las funciones.

## BAV_MOVIMIENTOS (vista)

Vista con `security_invoker = true` (respeta el RLS de quien consulta) para la lista:

| Columna | Origen |
|---|---|
| `id`, `id_cuenta`, `tipo`, `fecha`, `creado_en`, `id_categoria` | `BAT_MOVIMIENTOS` |
| `monto` | `monto::text` (sin pasar por float, ver research R3) |
| `nombre_categoria` | `BAT_CATEGORIAS.nombre` |

## Seguridad (RLS y permisos)

| Objeto | `anon` | `authenticated` |
|---|---|---|
| `BAT_CUENTAS` | nada | `SELECT` con `BAPOL_CUENTAS_PROPIETARIO`: `id_usuario = (SELECT auth.uid())` |
| `BAT_CATEGORIAS` | nada | `SELECT` con `BAPOL_CATEGORIAS_PROPIETARIO`: la cuenta es del usuario |
| `BAT_MOVIMIENTOS` | nada | `SELECT` con `BAPOL_MOVIMIENTOS_PROPIETARIO`: la cuenta es del usuario |
| `BAV_MOVIMIENTOS` | nada | `SELECT` (aplica el RLS de las tablas) |
| Funciones `BASP_*` | nada | `EXECUTE` |

## Transiciones del saldo

| Operación | Delta sobre el saldo |
|---|---|
| Alta de ingreso de `m` | `+m` |
| Alta de gasto de `m` | `−m` |
| Edición de (tipo₀, m₀) a (tipo₁, m₁) | `−signo(tipo₀)·m₀ + signo(tipo₁)·m₁` |
| Eliminación de (tipo, m) | `−signo(tipo)·m` |

`signo('INGRESO') = +1`, `signo('GASTO') = −1`. Ejemplo AC-63: gasto de 3.000 → ingreso de
3.000: `−(−3.000) + 3.000 = +6.000` (10.000 → 16.000).

## Validaciones (servidor y cliente)

| Regla | Servidor | Cliente | Mensaje |
|---|---|---|---|
| Monto > 0 | función + CHECK | al guardar | "El monto debe ser mayor a 0." |
| Monto ≤ 999.999.999.999,99 | función + CHECK | al guardar | "El monto máximo es 999.999.999.999,99." |
| Hasta 2 decimales | función (`p_monto = round(p_monto, 2)`) | filtro al escribir | (no se puede escribir) |
| Categoría del mismo tipo y cuenta | FK compuesta + función | selector filtrado | (no se puede elegir) |
| Fecha ≤ mañana en UTC | función | calendario hasta hoy local | (no se puede elegir) |
| Movimiento propio | función (`id_cuenta` del usuario) | — | "No se pudo …" |
