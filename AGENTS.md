# AGENTS.md

## Propósito

MiBalance es una app web para centralizar ingresos y gastos en una cuenta de balance única, con reportes por categoría para detectar el "gasto hormiga".

## Stack

- React 19 + Vite 8, Node 22.12+
- Supabase (cliente JS directo, sin backend propio) + PostgreSQL
- Autenticación: Google OAuth (vía Supabase Auth)
  - Temporal: mientras se construye la feature central se usa el inicio de sesión anónimo de Supabase. Aislar ese código para reemplazarlo por Google OAuth (RF-22, RF-23) sin tocar la lógica de movimientos.

## Convenciones de nombres

Todo el código propio va en español. Solo se exceptúan los nombres que imponen las herramientas (`main.jsx`, `App.jsx`, `vite.config.js`, `index.html`, variables `VITE_*`) y los nombres propios (Supabase, Google).

Terminología: los dos tipos de movimiento son **ingreso** y **gasto**. No usar "egreso" en ningún lado (código, SQL, textos de la interfaz). En la base de datos los valores son `'INGRESO'` y `'GASTO'`.

Tono de la interfaz: todos los textos y mensajes al usuario tratan de **usted** ("Vuelva a ingresar", "¿Está seguro que desea…?"), como el PRD.

Mayúsculas en la interfaz:
- Títulos, subtítulos, botones, pestañas, etiquetas de campos, encabezados de tablas y nombres de categorías y cuentas creados por la app: **mayúscula inicial en cada palabra** ("Añadir Gasto", "Pago Realizado", "Mi Cuenta", "Gastos por Categoría"). Los artículos, preposiciones y conjunciones (de, del, la, el, por, para, con, en, a, y, o) van en minúscula salvo que sean la primera palabra.
- Párrafos, mensajes de error, confirmaciones, textos de ayuda y placeholders: solo la primera letra de la oración en mayúscula ("Todavía no registró movimientos.").
- Los nombres que escribe el usuario (categorías propias) se guardan y muestran tal como los escribió.

### JavaScript / React

- Funciones y métodos: PascalCase en español, con verbo al inicio. Ej.: `AgregarIngreso`, `AgregarGasto`, `EditarMovimiento`, `EliminarMovimiento`, `ObtenerSaldo`.
- Componentes React: PascalCase en español. Ej.: `FormularioMovimiento`, `ListaMovimientos`.
- Estado de React: el setter de `useState` también es una función en español: `const [saldo, EstablecerSaldo] = useState(0)`. Los manejadores de eventos empiezan con `Manejar` (`ManejarEnvio`) y las props de callback con `al` (`alGuardar`, `alCancelar`).
- Clases CSS: kebab-case en español (`lista-movimientos`, `mensaje-error`).
- Variables y parámetros: camelCase en español. Ej.: `saldoActual`, `idCategoria`. Los identificadores llevan `id` al inicio.
- Archivos: los de componentes, igual que el componente (`FormularioMovimiento.jsx`); el resto, en camelCase (`clienteSupabase.js`, `movimientos.test.js`).

### Base de datos (PostgreSQL / Supabase)

Prefijo `BA` (Balance App) + tipo de objeto + nombre en español, en mayúsculas y con guiones bajos:

| Objeto | Prefijo | Ejemplo |
|---|---|---|
| Tabla | `BAT_` | `BAT_CUENTAS`, `BAT_CATEGORIAS`, `BAT_MOVIMIENTOS` |
| Trigger | `BATR_` | `BATR_CREAR_CUENTA_USUARIO` |
| Función de trigger | `BATF_` | `BATF_CREAR_CUENTA_USUARIO` |
| Stored procedure (función llamada vía RPC) | `BASP_` | `BASP_AGREGAR_MOVIMIENTO` |
| Vista | `BAV_` | `BAV_GASTOS_POR_CATEGORIA` |
| Índice | `BAIX_` | `BAIX_MOVIMIENTOS_CUENTA_FECHA` |
| Política RLS | `BAPOL_` | `BAPOL_MOVIMIENTOS_PROPIETARIO` |
| Clave primaria | `BAPK_` | `BAPK_MOVIMIENTOS` |
| Clave foránea | `BAFK_` | `BAFK_MOVIMIENTOS_CUENTA` |
| Restricción única | `BAUQ_` | `BAUQ_CUENTAS_USUARIO` |
| Restricción check | `BACK_` | `BACK_MOVIMIENTOS_MONTO_POSITIVO` |

- Columnas: snake_case en español, en minúsculas. Ej.: `id`, `id_usuario`, `id_cuenta`, `id_categoria`, `monto`, `saldo`, `fecha`, `tipo`. Las claves foráneas llevan `id_` al inicio (`id_usuario`, nunca `usuario_id`).
- Variables y parámetros en funciones SQL: snake_case en español, con prefijo `v_` para variables locales y `p_` para parámetros, respetando `id` al inicio. Ej.: `v_id_cuenta`, `p_monto`, `p_id_categoria`.
- Los nombres se escriben en MAYÚSCULAS y sin comillas en el SQL. PostgreSQL los guarda en minúsculas (`bat_movimientos`), así que desde supabase-js se referencian en minúsculas: `clienteSupabase.from('bat_movimientos')`, `clienteSupabase.rpc('basp_agregar_movimiento')`.
- Supabase solo expone por RPC funciones (`CREATE FUNCTION`), no `CREATE PROCEDURE`. Por eso los "stored procedures" con prefijo `BASP_` se definen como funciones.
- Los usuarios viven en `auth.users` de Supabase. No se crea una tabla `BAT_USUARIOS` salvo que haga falta guardar datos propios del usuario.

## Cómo correr

```bash
npm install
npm run dev
npm test
```

- Requiere `.env.local` (ver `.env.example`) y las migraciones de `supabase/migrations/` ejecutadas en orden.
- Los tests de `pruebas/` corren contra Supabase y crean 3 usuarios anónimos por corrida, marcados con `es_prueba = true`. Borrarlos con `supabase/scripts/limpiar_usuarios_prueba.sql`. Supabase limita los inicios de sesión anónimos (~30 por hora por IP).

## Reglas no negociables

Los principios del proyecto están en `.specify/memory/constitution.md` y prevalecen sobre este archivo. Leerla antes de planificar o implementar. Resumen:

1. Alcance estricto del PRD: nada fuera de `PRD.md` / `INTERFAZ.md` (ni múltiples cuentas, ni transferencias, ni multi-idioma, ni contraseña propia).
2. Pruebas obligatorias y cero regresiones: cada feature con sus pruebas y la suite completa pasando.
3. Seguridad y privacidad: RLS en todo, ningún secreto en el repo, errores sin detalles técnicos.
4. Integridad financiera: `numeric` (nunca float), operaciones atómicas, siempre con categoría, fechas sin UTC.
5. Dependencias en su última versión estable.
6. Al terminar y probar una feature, preguntar al usuario si desea hacer el commit.
