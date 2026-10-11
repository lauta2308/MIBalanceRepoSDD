# Research: Cuenta y Movimientos

**Feature**: 001-cuenta-movimientos | **Date**: 2026-10-10

Versiones verificadas en npm el 2026-10-10 (principio V: última versión estable).

## R1. Versiones de dependencias

- **Decision**:

  | Paquete | Versión | Uso |
  |---|---|---|
  | react, react-dom | 19.3.0 | Interfaz |
  | react-router | 8.4.0 | Pantallas de formulario con URL propia y flecha para volver atrás |
  | vite | 8.3.4 | Servidor de desarrollo y build |
  | @vitejs/plugin-react | 6.1.2 | Plugin de React para Vite 8 |
  | @supabase/supabase-js | 2.117.3 | Cliente de Supabase |
  | react-day-picker | 10.0.2 | Calendario (con date-fns 4.4.0 para el locale `es`) |
  | vitest | 5.0.3 | Pruebas unitarias y de integración |
  | jsdom | 30.1.2 | Entorno DOM para pruebas de componentes |
  | @testing-library/react | 16.3.3 | Pruebas de componentes |
  | @testing-library/user-event | 14.6.7 | Simulación de escritura y teclado |
  | @testing-library/jest-dom | 7.0.1 | Aserciones sobre el DOM |
  | @playwright/test | 1.64.0 | Pruebas de punta a punta, anchos de pantalla, teclado, rendimiento |
  | @axe-core/playwright | 4.13.0 | Contraste (UI-16, SC-008) |
  | eslint | 10.12.0 | Análisis estático |
  | @eslint/js, eslint-plugin-react-hooks, globals | 10.0.1, 7.1.1, 17.13.0 | Reglas recomendadas de JS y de React Hooks para ESLint (agregadas en la implementación) |
  | @testing-library/dom | 10.4.2 | Dependencia que exige @testing-library/react (agregada en la implementación) |

- **Rationale**: todas son compatibles entre sí (react-router 8 pide React ≥ 19.2.7; vitest 5 acepta
  Vite 8; Testing Library acepta React 19). Node local: v22.23.2 (cumple el mínimo 22.12).
- **Alternatives considered**: sin react-router (cambiar de pantalla con estado): se descartó
  porque la feature 002 lo necesita para la barra de navegación y habría que rehacer las pantallas.

## R2. Calendario

- **Decision**: react-day-picker en modo `single` y `required`, con locale `es`, `weekStartsOn: 1`,
  `disabled={{ after: hoy }}` y sin límite inferior.
- **Rationale**: cumple FR-008 completo: siempre hay una fecha seleccionada (no se puede
  deseleccionar), está en español, la semana empieza el lunes y es accesible con teclado (FR-036).
- **Alternatives considered**: `<input type="date">` nativo: permite borrar la fecha (viola RF-33),
  su idioma y su primer día de la semana dependen del navegador.

## R3. Montos sin float de punta a punta

- **Decision**:
  - Base de datos: `numeric(14,2)` para el monto de un movimiento (12 dígitos enteros cubren
    999.999.999.999,99) y `numeric` sin precisión fija para el saldo, con un CHECK de dos
    decimales.
  - Lectura: las vistas y funciones devuelven los montos **como texto** (`monto::text`).
    PostgREST serializa `numeric` como número JSON, y JavaScript lo leería como float (con 16
    dígitos o más pierde precisión: un saldo de 1.999.999.999.999,98 ya está en el límite).
  - Escritura: el cliente envía el monto como texto `"1500.50"`; PostgreSQL lo convierte a
    `numeric` sin pasar por float.
  - Cliente: `utilidades/montos.js` trabaja con cadenas y `BigInt` de centavos para formatear,
    normalizar y comparar. Nunca usa `Number`, `parseFloat` ni `toFixed` para montos.
- **Rationale**: RNF-04 y constitución IV (nunca float).
- **Alternatives considered**: guardar centavos como `bigint`: el PRD y la constitución piden
  decimal/numeric; y el saldo "sin tope de dígitos" no entra en un `bigint`.

## R4. Operaciones atómicas y concurrencia

- **Decision**: alta, edición y eliminación se hacen solo con funciones RPC `BASP_*` en una única
  transacción. Cada una bloquea la fila de la cuenta (`SELECT … FOR UPDATE`), escribe el
  movimiento y ajusta el saldo con un delta (`saldo = saldo + v_delta`).
- **Rationale**: una función de PostgreSQL es atómica (RNF-05, FR-020). El bloqueo de la cuenta
  serializa las operaciones simultáneas del mismo usuario (FR-004), y el delta evita perder
  actualizaciones.
- **Alternatives considered**: recalcular el saldo con `SUM` en cada operación: correcto, pero
  con 5.000 movimientos es más lento; se usa solo en las pruebas para verificar el invariante.

## R5. Seguridad: qué puede hacer el cliente

- **Decision**:
  - Tablas: RLS activado en las tres. `authenticated` solo tiene `SELECT` (con políticas de
    propietario); se revocan `INSERT`, `UPDATE` y `DELETE`. `anon` no tiene permisos.
  - Escritura: solo vía funciones `SECURITY DEFINER` con `search_path = ''`, que validan
    `auth.uid()` y todos los datos (FR-025, FR-026, FR-034).
  - Mismo tipo y misma cuenta: clave foránea compuesta
    `(id_categoria, id_cuenta, tipo) → BAT_CATEGORIAS(id, id_cuenta, tipo)`. La base de datos
    rechaza por sí misma una categoría de otro tipo o de otra cuenta, aunque una función tuviera
    un error.
  - La cuenta y sus categorías por defecto se crean con un trigger sobre `auth.users`
    (`BATR_CREAR_CUENTA_USUARIO`).
- **Rationale**: RNF-03 y constitución III: el aislamiento lo garantiza la base de datos, no la
  interfaz. Sin permisos de escritura directa, nadie puede cambiar el saldo sin un movimiento.
- **Alternatives considered**: permitir `INSERT` directo con RLS y triggers para el saldo: más
  superficie de ataque y más difícil de probar la atomicidad.

## R6. Fecha

- **Decision**: columna `date`. El cliente obtiene "hoy" con `getFullYear/getMonth/getDate` y
  arma `"AAAA-MM-DD"` a mano; las fechas leídas se interpretan partiendo la cadena, nunca con
  `new Date("AAAA-MM-DD")` ni `toISOString()`. El servidor rechaza
  `p_fecha > (now() AT TIME ZONE 'UTC')::date + 1`.
- **Rationale**: AGENTS.md y la aclaración de la spec (mañana en UTC).

## R7. Orden de la lista y paginación

- **Decision**: `ORDER BY fecha DESC, creado_en DESC, id DESC`, con `creado_en` asignado con
  `clock_timestamp()` y nunca modificado. Paginación en el servidor con `range()` y
  `count: 'exact'`, sobre el índice `BAIX_MOVIMIENTOS_CUENTA_FECHA`.
- **Rationale**: RF-48 y AC-37 (editar no cambia el orden); `id` desempata en el caso teórico de
  CHK009. Con 5.000 movimientos, leer de a 50 con índice cumple SC-003.

## R8. Orden de categorías

- **Decision**: en el cliente, con `Intl.Collator('es', { sensitivity: 'base' })`: la categoría por
  defecto primero, el resto por nombre sin distinguir mayúsculas ni tildes.
- **Rationale**: son pocas categorías; el mismo orden se reutiliza en la sección Categorías (002).

## R9. Simular fallas a mitad de una operación (AC-123)

- **Decision**: las funciones de escritura tienen el parámetro `p_simular_falla boolean DEFAULT
  false`. Si es `true`, la función lanza una excepción **después** de escribir el movimiento y
  **antes** de ajustar el saldo, y la transacción se revierte entera.
- **Rationale**: es la única forma de probar RNF-05 con el código real, sin service role. Es
  inofensivo: solo puede hacer fallar la operación de quien lo envía, que es su propio dato.
- **Alternatives considered**: tabla de "fallas programadas" escrita con service role: obliga a
  usar la clave secreta en las pruebas y agrega una tabla; funciones de prueba separadas: no
  probarían el código real.
- **Fallas en la interfaz (AC-127)**: Playwright intercepta la solicitud y responde con error 500.

## R10. Sesión temporal y pruebas

- **Decision**:
  - `servicios/sesion.js` es el único archivo que conoce el inicio de sesión anónimo
    (`signInAnonymously`). La feature 005 lo reemplaza sin tocar el resto.
  - Las pruebas crean usuarios anónimos con `options.data.es_prueba = true` (queda en
    `raw_user_meta_data`), y `supabase/scripts/limpiar_usuarios_prueba.sql` los borra (en cascada
    se borran sus cuentas, categorías y movimientos).
  - Integración: 3 usuarios por corrida (A, B y uno para la secuencia de AC-125), reutilizados en
    todos los archivos con un `globalSetup` de Vitest.
  - Punta a punta: 1 usuario por worker de Playwright, con 1 worker por defecto. Cada prueba
    elimina sus movimientos al terminar.
- **Rationale**: el límite de unas 30 sesiones anónimas por hora por IP. Se puede subir en el
  panel de Supabase (Authentication → Rate Limits) si hiciera falta.

## R11. Mensajes y accesibilidad

- **Decision**: mensajes, confirmaciones y el menú de fila con `<dialog>` nativo
  (`showModal()`). Los formularios son pantallas con URL propia. Los íconos de éxito y de error
  llevan `aria-label` ("Éxito", "Error").
- **Rationale**: `showModal()` deja inerte el resto de la página (FR-023: no se puede operar
  mientras hay un mensaje), maneja el foco y el teclado (FR-036), sin librerías.

## R12. Migraciones

- **Decision**: archivos SQL numerados en `supabase/migrations/` que se ejecutan en orden desde el
  SQL Editor de Supabase. No hay Supabase CLI, Docker ni psql instalados.
- **Rationale**: es lo que indica AGENTS.md y evita configurar herramientas nuevas.
- **Alternatives considered**: Supabase CLI con `db push`: requiere token de acceso y vincular el
  proyecto; se puede adoptar más adelante.

## R13. Medición de rendimiento (SC-003)

- **Decision**: la prueba crea su propio usuario y carga los 5.000 movimientos con
  `basp_agregar_movimiento` en tandas de 50 llamadas en paralelo (`pruebas/rendimiento/cargarDatos.js`),
  sin pasos manuales y con el mismo código que usa la aplicación. Una prueba de Playwright
  con CPU 4× (CDP `Emulation.setCPUThrottlingRate`) y red emulada mide 100 altas, 100 ediciones y
  100 eliminaciones y calcula el p95.
