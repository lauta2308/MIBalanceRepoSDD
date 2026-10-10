# Implementation Plan: Cuenta y Movimientos

**Branch**: `001-cuenta-movimientos` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-cuenta-movimientos/spec.md`

## Summary

Primera feature de MiBalance: cada usuario (por ahora con sesión anónima) tiene una cuenta "Mi
Cuenta" en USD con dos categorías por defecto, ve su saldo y registra, lista, edita y elimina
gastos e ingresos. Enfoque técnico: SPA en React 19 + Vite 8 que habla directo con Supabase. La
lógica crítica (validación, atomicidad, saldo) vive en PostgreSQL, en funciones RPC `BASP_*`
`SECURITY DEFINER`, con RLS y sin permisos de escritura directa para el cliente. Los montos son
`numeric` en la base de datos y viajan como texto, sin pasar nunca por float.

## Technical Context

**Language/Version**: JavaScript (ES2024) con JSX; SQL de PostgreSQL (Supabase). Node 22.12+.

**Primary Dependencies**: react 19.3, react-dom 19.3, react-router 8.4, @supabase/supabase-js
2.117, react-day-picker 10.0 + date-fns 4.4; build con vite 8.3 y @vitejs/plugin-react 6.1
(versiones y motivos en [research.md](research.md) R1).

**Storage**: PostgreSQL de Supabase: `BAT_CUENTAS`, `BAT_CATEGORIAS`, `BAT_MOVIMIENTOS`, vista
`BAV_MOVIMIENTOS` ([data-model.md](data-model.md)).

**Testing**: vitest 5 + Testing Library + jsdom (unitarias y de integración contra Supabase
real); @playwright/test 1.64 + @axe-core/playwright 4.13 (punta a punta, accesibilidad,
rendimiento).

**Target Platform**: navegadores modernos (Chrome estable como referencia del PRD), de 320px a
1920px de ancho.

**Project Type**: aplicación web de una sola página (SPA) sin backend propio.

**Performance Goals**: alta, edición y eliminación con lista y saldo actualizados en < 2 s (p95)
con 5.000 movimientos, CPU 4× y 100 ms de latencia (SC-003, RNF-02).

**Constraints**: montos sin float (RNF-04); operaciones atómicas (RNF-05); aislamiento por RLS
(RNF-03); fechas sin conversión a UTC; ~30 sesiones anónimas nuevas por hora por IP; sin
Supabase CLI ni Docker (migraciones por SQL Editor).

**Scale/Scope**: 1 cuenta por usuario, hasta miles de movimientos por cuenta; 4 pantallas
(Cuenta, Añadir Gasto, Añadir Ingreso, Editar Movimiento) y 5 tipos de diálogo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple el plan | Estado |
|---|---|---|
| I. Alcance estricto del PRD | Solo RF/RNF/UI asignados a 001 en el mapa de la spec. Las funciones extra (`basp_obtener_cuenta`, vista) son soporte técnico, no funcionalidad nueva. `p_simular_falla` existe solo para probar RNF-05. | ✅ |
| II. Pruebas obligatorias | Cada AC de la spec se cubre con pruebas unitarias, de integración o de punta a punta; `npm test` corre todas. Los usuarios de prueba llevan `es_prueba = true` y hay script de limpieza. RNF-03/05 se prueban contra la API, sin interfaz. | ✅ |
| III. Seguridad y privacidad | RLS en las 3 tablas; cliente solo con `SELECT`; escritura solo por funciones que validan `auth.uid()`; FK compuesta para categorías; solo `VITE_*` en el cliente, nunca service_role; errores traducidos sin detalles técnicos; sin datos financieros en `console`. Sesión anónima aislada en `servicios/sesion.js`. | ✅ |
| IV. Integridad financiera | `numeric(14,2)` y `numeric` para el saldo; montos como texto en la API y `BigInt` en el cliente; funciones atómicas con bloqueo de cuenta; categoría por defecto preseleccionada y FK obligatoria; `date` sin UTC; términos INGRESO/GASTO. | ✅ |
| V. Última versión estable | Todas las dependencias en su última versión estable al 2026-10-10 (research R1); `npm audit` al instalar. | ✅ |
| Restricciones técnicas | React + Vite + Supabase sin backend; lógica crítica en `BASP_*`; código y textos en español con trato de usted; 320–1920px. | ✅ |
| Flujo de desarrollo | Rama `001-cuenta-movimientos`; al terminar y con pruebas en verde se pregunta antes de commitear. | ✅ |

**Re-check post-diseño (Phase 1)**: sin violaciones. Complexity Tracking queda vacío.

## Project Structure

### Documentation (this feature)

```text
specs/001-cuenta-movimientos/
├── spec.md
├── plan.md              # Este archivo
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── supabase.md      # Datos, RPC, errores, accesos que deben fallar
│   └── interfaz.md      # Rutas, pantallas, textos, utilidades de formato
├── checklists/
│   ├── requirements.md
│   └── revision-formal.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
index.html
package.json
vite.config.js                 # Vite + configuración de Vitest (proyectos unitarias/integración)
playwright.config.js
eslint.config.js
.env.example                   # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

src/
├── main.jsx
├── App.jsx                    # Resuelve la sesión y define las rutas
├── servicios/
│   ├── clienteSupabase.js     # createClient con las variables VITE_*
│   ├── sesion.js              # ÚNICO lugar con la sesión anónima (se reemplaza en 005)
│   ├── cuenta.js              # ObtenerCuenta
│   ├── categorias.js          # ObtenerCategorias
│   ├── movimientos.js         # ObtenerPaginaMovimientos, AgregarMovimiento, EditarMovimiento, EliminarMovimiento
│   └── errores.js             # TraducirError: código de la API → texto de la spec
├── utilidades/
│   ├── montos.js              # Formato, filtro y validación con cadenas y BigInt
│   ├── fechas.js              # Hoy local, formato DD/MM/AAAA, conversión para el calendario
│   └── categorias.js          # OrdenarCategorias (Intl.Collator 'es')
├── componentes/
│   ├── SeccionCuenta.jsx
│   ├── EncabezadoCuenta.jsx   # Nombre, moneda y saldo con color
│   ├── ListaMovimientos.jsx   # Grupos por fecha
│   ├── FilaMovimiento.jsx
│   ├── Paginacion.jsx
│   ├── PantallaMovimiento.jsx # Ruta de alta/edición: carga datos y arma el formulario
│   ├── FormularioMovimiento.jsx
│   ├── CampoMonto.jsx
│   ├── SelectorCategoria.jsx
│   ├── SelectorFecha.jsx      # react-day-picker
│   ├── SelectorTipo.jsx
│   ├── BotonVolver.jsx
│   ├── Dialogo.jsx            # Base sobre <dialog> modal
│   ├── MenuMovimiento.jsx
│   ├── Confirmacion.jsx
│   ├── Mensaje.jsx            # Éxito / error con "Aceptar"
│   └── PantallaErrorSesion.jsx
└── estilos/
    └── app.css                # Variables de color con contraste AA

supabase/
├── migrations/
│   └── 0001_cuenta_movimientos.sql   # Tablas, índices, RLS, permisos, trigger, vista, funciones BASP_*
└── scripts/
    ├── limpiar_usuarios_prueba.sql
    └── cargar_movimientos_rendimiento.sql

pruebas/
├── unitarias/                 # *.test.js / *.test.jsx (jsdom)
├── integracion/               # *.test.js contra Supabase (node)
│   └── configuracionGlobal.js # Crea los 3 usuarios de prueba de la corrida
├── e2e/                       # *.spec.js (Playwright)
└── rendimiento/               # *.spec.js (Playwright, CPU 4×)
```

**Structure Decision**: un solo proyecto web en la raíz (no hay backend propio: Supabase cumple ese
rol). La lógica de dominio que debe ser segura y atómica está en `supabase/migrations/`; el
cliente se divide en `servicios/` (acceso a datos), `utilidades/` (funciones puras, fáciles de
probar) y `componentes/`. Las pruebas van en `pruebas/`, como indica AGENTS.md.

## Decisiones Clave

Resumen de [research.md](research.md):

1. **Montos como texto en la API y `BigInt` en el cliente** (R3): evita la pérdida de precisión de
   `numeric` → número JSON → float.
2. **Escritura solo por RPC atómicas con bloqueo de la cuenta** (R4, R5): cumple RNF-05, FR-004 y
   FR-034 en un solo mecanismo.
3. **FK compuesta `(id_categoria, id_cuenta, tipo)`** (R5): la base de datos garantiza que la
   categoría es de la misma cuenta y del mismo tipo.
4. **`p_simular_falla`** (R9): prueba la atomicidad con el código real, sin service role.
5. **`<dialog>` nativo** (R11): mensajes modales, foco y teclado sin librerías.
6. **react-day-picker** (R2): calendario en español, desde el lunes, sin fecha vacía.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Límite de sesiones anónimas al correr las pruebas varias veces | Reutilizar usuarios por corrida (R10); subir el límite en el panel si hace falta |
| Medición de SC-003 sensible a la red local | Emular la red en Playwright y documentar las condiciones en el resultado |
| Migraciones aplicadas a mano fuera de orden | Numeración `0001_…`; cada migración es idempotente donde se pueda |

## Cierre de la Feature

Última tarea, después de que pase toda la suite: actualizar `AGENTS.md` con las librerías
incorporadas (react-router, react-day-picker + date-fns, Vitest + Testing Library + jsdom,
Playwright + axe-core, ESLint, sin números de versión) y con los comandos nuevos de "Cómo correr"
(`npm run test:e2e`, `npx playwright install chromium`, activar el inicio de sesión anónimo en
Supabase). El cambio se revisa con el usuario antes de commitearlo.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
