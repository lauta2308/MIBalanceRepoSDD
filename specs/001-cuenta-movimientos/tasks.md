---

description: "Lista de tareas de la feature 001 Cuenta y Movimientos"
---

# Tasks: Cuenta y Movimientos

**Input**: Design documents from `specs/001-cuenta-movimientos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/supabase.md,
contracts/interfaz.md, quickstart.md

**Tests**: obligatorias por la constitución (principio II). Dentro de cada historia, las pruebas
se escriben primero y deben fallar antes de implementar.

**Organization**: tareas agrupadas por historia de usuario. Las tareas marcadas **(usuario)** las
hace el usuario a mano en el panel de Supabase; el resto, el agente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de la spec (US1..US5)
- Convenciones de nombres de AGENTS.md: funciones en PascalCase con verbo, variables en
  camelCase, objetos SQL con prefijo `BA*`, todo en español.

## Path Conventions

Proyecto web único en la raíz: `src/`, `supabase/`, `pruebas/` (ver plan.md). Refinamiento
respecto del plan: las funciones de escritura van en migraciones separadas por historia
(`0002`..`0004`) para que cada historia se pueda entregar sola; `0001` tiene el esquema común.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicializar el proyecto con el stack del plan.

- [X] T001 Crear `package.json` con `"type": "module"`, `"engines": { "node": ">=22.12" }`, dependencias react@19.3.0, react-dom@19.3.0, react-router@8.4.0, @supabase/supabase-js@2.117.3, react-day-picker@10.0.2, date-fns@4.4.0 y devDependencies vite@8.3.4, @vitejs/plugin-react@6.1.2, vitest@5.0.3, jsdom@30.1.2, @testing-library/react@16.3.3, @testing-library/user-event@14.6.7, @testing-library/jest-dom@7.0.1, @playwright/test@1.64.0, @axe-core/playwright@4.13.0, eslint@10.12.0; scripts `dev`, `build`, `preview`, `lint`, `test:unitarias` (`vitest run --project unitarias`), `test:integracion` (`vitest run --project integracion`), `test:e2e` (`playwright test --project e2e`), `test:rendimiento` (`playwright test --project rendimiento`) y `test` (unitarias, integración y e2e en ese orden; sin rendimiento)
- [X] T002 [P] Crear `vite.config.js` con `@vitejs/plugin-react` y dos proyectos de Vitest: `unitarias` (entorno jsdom, `pruebas/unitarias/**/*.test.{js,jsx}`, setup que importa `@testing-library/jest-dom/vitest`) e `integracion` (entorno node, `pruebas/integracion/**/*.test.js`, `globalSetup: pruebas/integracion/configuracionGlobal.js`, `fileParallelism: false`, `testTimeout: 30000`); ambos cargan las variables de `.env.local`
- [X] T003 [P] Crear `playwright.config.js` con proyectos `e2e` (`pruebas/e2e`) y `rendimiento` (`pruebas/rendimiento`), Chromium, `workers: 1`, `webServer: npm run dev` en `http://localhost:5173`, `locale: 'es-AR'`
- [X] T004 [P] Crear `eslint.config.js` (reglas recomendadas de JS y React Hooks; `no-console: error` en `src/` para cumplir FR-035)
- [X] T005 [P] Crear `.env.example` con `VITE_SUPABASE_URL=` y `VITE_SUPABASE_PUBLISHABLE_KEY=` (sin valores), y `.gitignore` con `node_modules/`, `dist/`, `.env.local`, `test-results/`, `playwright-report/`
- [X] T006 [P] Crear `index.html` (`lang="es"`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, título "MiBalance") y `src/main.jsx` que monta `App` dentro de `BrowserRouter` e importa `src/estilos/app.css`
- [X] T007 Ejecutar `npm install`, `npx playwright install chromium` y `npm audit`; si hay vulnerabilidades, resolverlas o documentarlas antes de seguir (constitución V)
- [X] T008 (usuario) En Supabase: activar Authentication → Sign In / Providers → "Allow anonymous sign-ins", y crear `.env.local` con la URL y la clave publishable del proyecto (nunca la clave secreta)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema de base de datos, seguridad, sesión, utilidades y componentes base que usan
todas las historias.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

### Base de datos (`supabase/migrations/0001_esquema_cuenta_movimientos.sql`)

- [X] T009 Crear la tabla `BAT_CUENTAS` en `supabase/migrations/0001_esquema_cuenta_movimientos.sql`: `id uuid` PK `BAPK_CUENTAS` `DEFAULT gen_random_uuid()`; `id_usuario uuid` FK `BAFK_CUENTAS_USUARIO` → `auth.users(id)` `ON DELETE CASCADE` con único `BAUQ_CUENTAS_USUARIO`; `nombre varchar(30) NOT NULL DEFAULT 'Mi Cuenta'` con `BACK_CUENTAS_NOMBRE_VALIDO`: `nombre = btrim(nombre) AND nombre <> ''`; `codigo_moneda char(3) NOT NULL DEFAULT 'USD'` con `BACK_CUENTAS_CODIGO_MONEDA`: `~ '^[A-Z]{3}$'`; `saldo numeric NOT NULL DEFAULT 0` (sin precisión fija) con `BACK_CUENTAS_SALDO_DOS_DECIMALES`: `saldo = round(saldo, 2)`; `creado_en timestamptz NOT NULL DEFAULT now()`
- [X] T010 Crear la tabla `BAT_CATEGORIAS` en el mismo archivo: `id uuid` PK `BAPK_CATEGORIAS`; `id_cuenta uuid NOT NULL` FK `BAFK_CATEGORIAS_CUENTA` → `BAT_CUENTAS(id)` `ON DELETE CASCADE`; `nombre varchar(30) NOT NULL` con `BACK_CATEGORIAS_NOMBRE_VALIDO`: `nombre = btrim(nombre) AND nombre <> ''`; `tipo text NOT NULL` con `BACK_CATEGORIAS_TIPO`: `IN ('INGRESO', 'GASTO')`; `es_por_defecto boolean NOT NULL DEFAULT false`; `creado_en timestamptz NOT NULL DEFAULT now()`; único `BAUQ_CATEGORIAS_ID_CUENTA_TIPO (id, id_cuenta, tipo)`; índice único parcial `BAIX_CATEGORIAS_POR_DEFECTO (id_cuenta, tipo) WHERE es_por_defecto`
- [X] T011 Crear la tabla `BAT_MOVIMIENTOS` en el mismo archivo: `id uuid` PK `BAPK_MOVIMIENTOS`; `id_cuenta uuid NOT NULL` FK `BAFK_MOVIMIENTOS_CUENTA` → `BAT_CUENTAS(id)` `ON DELETE CASCADE`; `id_categoria uuid NOT NULL`; `tipo text NOT NULL` con `BACK_MOVIMIENTOS_TIPO`: `IN ('INGRESO', 'GASTO')`; `monto numeric(14,2) NOT NULL` con `BACK_MOVIMIENTOS_MONTO_POSITIVO`: `> 0` y `BACK_MOVIMIENTOS_MONTO_MAXIMO`: `<= 999999999999.99`; `fecha date NOT NULL`; `creado_en timestamptz NOT NULL DEFAULT clock_timestamp()`; FK compuesta `BAFK_MOVIMIENTOS_CATEGORIA (id_categoria, id_cuenta, tipo)` → `BAT_CATEGORIAS(id, id_cuenta, tipo)` `ON UPDATE NO ACTION ON DELETE NO ACTION` (ver data-model.md); índices `BAIX_MOVIMIENTOS_CUENTA_FECHA (id_cuenta, fecha DESC, creado_en DESC, id DESC)` y `BAIX_MOVIMIENTOS_CATEGORIA (id_categoria)`
- [X] T012 Agregar seguridad en el mismo archivo: `ENABLE ROW LEVEL SECURITY` en las tres tablas; `REVOKE ALL` a `anon` y `authenticated`; `GRANT SELECT` a `authenticated`; políticas de solo lectura `BAPOL_CUENTAS_PROPIETARIO` (`id_usuario = (SELECT auth.uid())`), `BAPOL_CATEGORIAS_PROPIETARIO` y `BAPOL_MOVIMIENTOS_PROPIETARIO` (la `id_cuenta` pertenece a una cuenta con `id_usuario = (SELECT auth.uid())`); sin políticas de `INSERT`/`UPDATE`/`DELETE` (FR-025, FR-034)
- [X] T013 Agregar en el mismo archivo la función `BATF_CREAR_CUENTA_USUARIO()` (`SECURITY DEFINER`, `SET search_path = ''`) y el trigger `BATR_CREAR_CUENTA_USUARIO` `AFTER INSERT ON auth.users`, que crean la cuenta "Mi Cuenta" en USD con saldo 0 y las categorías "Pago Realizado" (`GASTO`, `es_por_defecto = true`) y "Pago Ingresado" (`INGRESO`, `es_por_defecto = true`) (FR-001)
- [X] T014 Agregar en el mismo archivo la vista `BAV_MOVIMIENTOS` `WITH (security_invoker = true)` con `id`, `id_cuenta`, `tipo`, `fecha`, `creado_en`, `id_categoria`, `monto::text AS monto` y `BAT_CATEGORIAS.nombre AS nombre_categoria`; `GRANT SELECT` a `authenticated`
- [X] T015 Agregar en el mismo archivo la función `BASP_OBTENER_CUENTA()` (`SECURITY DEFINER`, `SET search_path = ''`, `STABLE`) que devuelve `id`, `nombre`, `codigo_moneda` y `saldo::text` de la cuenta de `auth.uid()` (contracts/supabase.md); `REVOKE EXECUTE` a `public` y `anon`, `GRANT EXECUTE` a `authenticated`
- [X] T016 [P] Crear `supabase/scripts/limpiar_usuarios_prueba.sql`, que borra de `auth.users` los usuarios con `raw_user_meta_data->>'es_prueba' = 'true'` (en cascada se borran sus cuentas, categorías y movimientos) e informa cuántos borró
- [X] T017 (usuario) Ejecutar `supabase/migrations/0001_esquema_cuenta_movimientos.sql` en el SQL Editor de Supabase

### Infraestructura de pruebas

- [X] T018 [P] Crear `pruebas/integracion/ayudantes.js` con `CrearClientePrueba()` (cliente supabase-js sin persistir sesión), `CrearUsuarioPrueba()` (`signInAnonymously({ options: { data: { es_prueba: true } } })` y devuelve el cliente autenticado y su cuenta), `ObtenerSaldo(cliente)`, `CalcularSaldoEsperado(cliente)` (suma de ingresos menos gastos con aritmética exacta de cadenas/BigInt, nunca float) y `EliminarMovimientosDe(cliente)`
- [X] T019 Crear `pruebas/integracion/configuracionGlobal.js` (globalSetup de Vitest) que crea exactamente 3 usuarios de prueba por corrida (A, B y uno para secuencias) y los comparte con los archivos de prueba mediante `provide` (research R10)
- [X] T020 [P] Crear `pruebas/e2e/ayudantes.js` con fixtures de Playwright: un usuario anónimo de prueba por worker (marcado `es_prueba`) cuya sesión se inyecta en el navegador; función para cargar movimientos (vía `basp_agregar_movimiento`) con esa sesión; función `SimularCategorias(page, categorias)` que intercepta con `page.route` la lectura de `bat_categorias` y agrega categorías propias simuladas; limpieza de movimientos al final de cada prueba; y `EsperarSinDesplazamientoHorizontal(page)`

### Cliente: servicios, utilidades y componentes base

- [X] T021 [P] Crear `src/servicios/clienteSupabase.js` con `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)` y error claro en desarrollo si faltan las variables
- [X] T022 [P] Crear `src/servicios/sesion.js` con `ObtenerOIniciarSesion()`: devuelve la sesión persistida o llama a `signInAnonymously()`; es el único archivo que conoce la sesión anónima (se reemplaza en la feature 005)
- [X] T023 [P] Escribir `pruebas/unitarias/montos.test.js` con todos los casos de contracts/interfaz.md (formato "1.500,50", signos, filtro de "abc50", "-50", "10,555", "$1.500,50", "007", ",5", "1500,", vacío; validación de 0 y de 1.000.000.000.000,00; tope 999.999.999.999,99 aceptado; saldo de 16 dígitos sin pérdida)
- [X] T024 Implementar `src/utilidades/montos.js` (`FormatearMonto`, `FormatearMontoConSigno`, `FiltrarEntradaMonto`, `ConvertirEntradaAMontoApi`, `ConvertirMontoApiAEntrada`, `ValidarMonto`) solo con cadenas y `BigInt` de centavos; prohibido `Number`, `parseFloat`, `toFixed` sobre montos (research R3); hacer pasar T023
- [X] T025 [P] Escribir `pruebas/unitarias/fechas.test.js` (hoy local con reloj simulado a las 23:30 en UTC-3 sigue siendo el mismo día; "2026-09-17" → "17/09/2026"; ida y vuelta texto ↔ fecha del calendario sin corrimiento) e implementar `src/utilidades/fechas.js` (`ObtenerFechaHoy`, `FormatearFecha`, `ConvertirTextoAFechaLocal`, `ConvertirFechaLocalATexto`) sin `toISOString()` ni `new Date("AAAA-MM-DD")`
- [X] T026 [P] Escribir `pruebas/unitarias/categorias.test.js` (AC-58: "Pago Realizado", "café", "Mercado", "Transporte"; "Ómnibus" ordena como "Omnibus") e implementar `src/utilidades/categorias.js` con `OrdenarCategorias` y `FiltrarCategoriasPorTipo` usando `Intl.Collator('es', { sensitivity: 'base' })`
- [X] T027 [P] Escribir `pruebas/unitarias/errores.test.js` e implementar `src/servicios/errores.js` con `TraducirError(error, operacion)`: códigos de contracts/supabase.md → textos exactos de FR-010 y FR-024; `MOVIMIENTO_INEXISTENTE` → "El movimiento ya no existe. La lista se actualizará." (en edición y eliminación); cualquier error desconocido o de red → "No se pudo … Vuelva a intentarlo." de la operación; nunca devuelve el mensaje técnico
- [X] T028 [P] Crear `src/estilos/app.css` con variables de color en `:root` (texto, fondo, verde y rojo de montos, íconos) que cumplan contraste ≥ 4,5:1 (texto) y ≥ 3:1 (íconos) (UI-16), foco visible en todos los elementos interactivos (FR-036), diseño fluido de 320px a 1920px sin desplazamiento horizontal y montos con `overflow-wrap: anywhere` (FR-030)
- [X] T029 [P] Crear `src/componentes/Dialogo.jsx` sobre `<dialog>` con `showModal()` (resto de la página inerte, foco al abrir, devolución del foco al cerrar; prop `alCerrar` para Esc/clic fuera cuando se permita) y `src/componentes/BotonVolver.jsx` (flecha con `aria-label="Volver"`)
- [X] T030 Escribir `pruebas/unitarias/Mensaje.test.jsx` (tic verde con `aria-label="Éxito"`, cruz roja con `aria-label="Error"`, sigue visible hasta "Aceptar", AC-113) e implementar `src/componentes/Mensaje.jsx` con un contexto `ProveedorMensajes` y `MostrarMensaje({ tipo, texto })` (un solo mensaje a la vez, FR-023)
- [X] T031 Implementar `src/componentes/PantallaErrorSesion.jsx` ("No se pudo iniciar sesión. Vuelva a intentarlo." con cruz roja y "Aceptar" que reintenta) y `src/App.jsx`: resuelve la sesión con `ObtenerOIniciarSesion` mostrando "Cargando…", muestra `PantallaErrorSesion` si falla (FR-033), envuelve todo en `ProveedorMensajes` y define las rutas de contracts/interfaz.md (ruta desconocida → `/`)

**Checkpoint**: base lista. Las historias pueden empezar.

---

## Phase 3: User Story 1 - Ver el saldo y registrar gastos e ingresos (Priority: P1) 🎯 MVP

**Goal**: el usuario ve "Mi Cuenta (USD)" con su saldo y registra gastos e ingresos con monto,
categoría y fecha; el saldo se actualiza al instante.

**Independent Test**: con un usuario nuevo, registrar un gasto y un ingreso y comprobar el
saldo; registrar montos inválidos y comprobar que se rechazan.

### Tests for User Story 1 ⚠️

> Escribirlas primero y comprobar que fallan.

- [X] T032 [P] [US1] Escribir `pruebas/integracion/cuentaPorDefecto.test.js`: un usuario nuevo tiene una única cuenta "Mi Cuenta", USD, saldo "0.00", y exactamente "Pago Realizado" (GASTO) y "Pago Ingresado" (INGRESO) por defecto (AC-09, FR-001)
- [X] T033 [P] [US1] Escribir `pruebas/integracion/agregarMovimiento.test.js` contra `basp_agregar_movimiento` (casos válidos, con categorías por defecto): gasto 1500 → saldo −1500 y de 10.000 a 8.500 (AC-43); ingreso (AC-44); 0,10 + 0,20 = "0.30" exacto (AC-121); dos de 999999999999.99 → "1999999999999.98" (AC-122); gasto mayor que el saldo deja saldo negativo (AC-59); fecha de mañana en UTC aceptada
- [X] T034 [P] [US1] Escribir `pruebas/integracion/validacionesAgregarMovimiento.test.js` contra `basp_agregar_movimiento` (rechazos; en todos el saldo no cambia y no queda movimiento): rechazos `MONTO_NO_POSITIVO` (0, −50), `MONTO_MAXIMO` (1000000000000.00), `MONTO_DECIMALES` (10.555), `CATEGORIA_INVALIDA` (categoría de ingreso en un gasto; categoría de otro usuario), `FECHA_INVALIDA` (fecha de pasado mañana en UTC); con `p_simular_falla = true` no queda movimiento y el saldo no cambia (AC-49 y AC-123 parte alta)
- [X] T035 [P] [US1] Escribir `pruebas/unitarias/CampoMonto.test.jsx`: escribir "1500000" muestra "1.500.000"; "1500,50" → "1.500,50"; "10,555" → "10,55"; "-50" y "abc50" → "50"; pegar "$1.500,50" → "1.500,50" (AC-50, AC-51, AC-UI-03, FR-009)
- [X] T036 [P] [US1] Escribir `pruebas/unitarias/FormularioMovimiento.test.jsx` (modo alta): abre con monto vacío, categoría por defecto del tipo y fecha de hoy (AC-55, FR-006); el selector solo muestra categorías del tipo, ordenadas y sin opción vacía (AC-54, AC-58); "Guardar" con monto vacío o 0 muestra "El monto debe ser mayor a 0." y no llama al servicio (AC-45); con 1.000.000.000.000,00 muestra "El monto máximo es 999.999.999.999,99." (AC-46); mientras guarda, "Guardando…" deshabilitado y "Cancelar" y la flecha deshabilitados, y un segundo clic no llama dos veces al servicio (FR-032); si el servicio falla, el formulario sigue abierto con los valores y se muestra "No se pudo registrar el gasto. Vuelva a intentarlo." (FR-020, FR-024)
- [X] T037 [P] [US1] Escribir `pruebas/e2e/registrarMovimientos.spec.js` (con categorías por defecto): usuario nuevo ve "Mi Cuenta (USD)", "USD 0,00" y "Aquí verá sus movimientos." (AC-09, AC-42, AC-UI-13); alta de gasto en 3 interacciones con valores por defecto (SC-002); flujos de AC-43, AC-44, AC-52, AC-59 con colores de saldo y montos (AC-UI-02, AC-UI-05); el mensaje de éxito sigue visible a los 10 s y se cierra con "Aceptar" (AC-111, AC-113, AC-UI-15)
- [X] T038 [P] [US1] Escribir `pruebas/e2e/formularioAlta.spec.js`: con `SimularCategorias` ("Transporte", "café", "Mercado"), el selector muestra solo gastos en el orden de AC-58 (AC-54); calendario en español, desde el lunes, hoy seleccionado, días futuros deshabilitados (AC-53, AC-56); "Cancelar" y flecha no registran nada y el formulario vuelve a sus valores por defecto (AC-05, AC-57, AC-67 parte alta)

### Implementation for User Story 1

- [X] T039 [US1] Crear `supabase/migrations/0002_agregar_movimiento.sql` con `BASP_AGREGAR_MOVIMIENTO(p_tipo text, p_monto numeric, p_id_categoria uuid, p_fecha date, p_simular_falla boolean DEFAULT false) RETURNS uuid` (`SECURITY DEFINER`, `SET search_path = ''`): bloquea la cuenta de `auth.uid()` con `FOR UPDATE` (o `SIN_CUENTA`); valida `TIPO_INVALIDO`, `MONTO_NO_POSITIVO` (nulo o `<= 0`), `MONTO_MAXIMO` (`> 999999999999.99`), `MONTO_DECIMALES` (`p_monto <> round(p_monto, 2)`), `FECHA_INVALIDA` (nula o `> (now() AT TIME ZONE 'UTC')::date + 1`), `CATEGORIA_INVALIDA` (no existe en la cuenta con ese tipo); inserta el movimiento; si `p_simular_falla` lanza `FALLA_SIMULADA`; suma o resta el monto al saldo; devuelve el id. `REVOKE EXECUTE` a `public`/`anon`, `GRANT` a `authenticated`
- [X] T040 [US1] (usuario) Ejecutar `supabase/migrations/0002_agregar_movimiento.sql` en el SQL Editor
- [X] T041 [P] [US1] Crear `src/servicios/cuenta.js` (`ObtenerCuenta` vía `rpc('basp_obtener_cuenta')`) y `src/servicios/categorias.js` (`ObtenerCategorias` desde `bat_categorias`)
- [X] T042 [US1] Crear `src/servicios/movimientos.js` con `ObtenerPaginaMovimientos(numeroPagina)` (vista `bav_movimientos`, orden `fecha`, `creado_en`, `id` descendente, `range` de 50, `count: 'exact'`) y `AgregarMovimiento({ tipo, monto, idCategoria, fecha })` (monto como texto "1500.50")
- [X] T043 [P] [US1] Implementar `src/componentes/EncabezadoCuenta.jsx`: "<nombre> (<código>)" y saldo "<código> <monto>" con clase verde/rojo/normal según el signo, sin cortar dígitos (FR-002, FR-003, UI-01..03)
- [X] T044 [P] [US1] Implementar `src/componentes/CampoMonto.jsx` (usa `FiltrarEntradaMonto` al escribir y al pegar, `inputMode="decimal"`, etiqueta "Monto") y hacer pasar T035
- [X] T045 [P] [US1] Implementar `src/componentes/SelectorCategoria.jsx` (`<select>` con las categorías del tipo ya ordenadas, siempre con una seleccionada, etiqueta "Categoría") y `src/componentes/SelectorFecha.jsx` (react-day-picker `mode="single"`, `required`, locale `es`, `weekStartsOn={1}`, `disabled={{ after: hoy }}`, sin fecha mínima; muestra la fecha elegida en "DD/MM/AAAA"; operable con teclado)
- [X] T046 [US1] Implementar `src/componentes/FormularioMovimiento.jsx` (modo alta): título "Añadir Gasto"/"Añadir Ingreso", campos, "Guardar" y "Cancelar", validación al guardar con `ValidarMonto`, estado "Guardando…" que deshabilita botones y flecha (FR-032), error que deja el formulario abierto (FR-020); hacer pasar T036
- [X] T047 [US1] Implementar `src/componentes/PantallaMovimiento.jsx` para las rutas `/movimientos/nuevo/gasto` y `/movimientos/nuevo/ingreso`: carga categorías (error → "No se pudieron cargar las categorías. Vuelva a intentarlo." y, al presionar "Aceptar", vuelve a `/?pagina=N`), monta el formulario con valores nuevos cada vez (RF-31), al guardar con éxito vuelve a `/` (página 1) y después muestra "Gasto registrado con éxito." o "Ingreso registrado con éxito." (FR-022); flecha y "Cancelar" vuelven a `/?pagina=N` sin guardar, con la `pagina` recibida en la dirección del formulario (contracts/interfaz.md, Rutas)
- [X] T048 [P] [US1] Implementar `src/componentes/FilaMovimiento.jsx` (categoría a la izquierda, `FormatearMontoConSigno` a la derecha en rojo o verde, sin tipo ni moneda, nombres largos en varias líneas) y `src/componentes/ListaMovimientos.jsx` (grupos por fecha con encabezado "DD/MM/AAAA") (FR-012)
- [X] T049 [US1] Implementar `src/componentes/SeccionCuenta.jsx`: carga cuenta y primera página con "Cargando…", muestra `EncabezadoCuenta`, botones "Añadir Gasto" y "Añadir Ingreso", "Aquí verá sus movimientos." si no hay movimientos, la lista, y "No se pudieron cargar los movimientos. Vuelva a intentarlo." si falla la carga de la cuenta o de la lista (sin mostrar saldo ni lista; "Aceptar" reintenta la carga, FR-024); recarga al volver de un alta
- [X] T050 [US1] Ejecutar `npm run test:unitarias`, `npm run test:integracion` y `npx playwright test pruebas/e2e/registrarMovimientos.spec.js pruebas/e2e/formularioAlta.spec.js` y corregir hasta que T032–T038 pasen

**Checkpoint**: MVP: el usuario ve su saldo y registra movimientos. Se puede demostrar sola.

---

## Phase 4: User Story 2 - Consultar la lista de movimientos (Priority: P2)

**Goal**: lista ordenada por fecha y momento del alta, agrupada por día y paginada de a 50.

**Independent Test**: con 0, 30 y 120 movimientos, verificar orden, grupos y paginación.

### Tests for User Story 2 ⚠️

- [ ] T051 [P] [US2] Escribir `pruebas/integracion/listaMovimientos.test.js`: con la estructura de AC-36 usando las categorías por defecto (gasto del 17/09/2026, ingreso del 01/10/2026 y después gasto del 01/10/2026), la vista devuelve el gasto y el ingreso del 01/10/2026 (en ese orden) y luego el del 17/09/2026; con 120 movimientos, `range` de 50 y `count` 120; montos como texto; el usuario B no ve filas de A
- [ ] T052 [P] [US2] Escribir `pruebas/unitarias/Paginacion.test.jsx`: oculta todo con ≤ 50; "Página 1 de 3" con "Anterior" deshabilitado; "Página 3 de 3" con "Siguiente" deshabilitado; botones deshabilitados mientras carga (FR-014)
- [ ] T053 [P] [US2] Escribir `pruebas/e2e/listaMovimientos.spec.js`: AC-36 con categorías por defecto (grupos y orden), AC-38 y AC-39 (120 movimientos y navegación), AC-41 (30 movimientos sin paginación), AC-40 parte alta (desde la página 2, un alta vuelve a la página 1 con el nuevo primero), AC-UI-04 y AC-UI-14 (formato de filas); página vacía (FR-014): con 51 movimientos, en `/?pagina=2` se borra por la API el movimiento de esa página y al recargar se ve la página 1 con 50 movimientos y sin paginación, y la dirección ya no tiene `pagina=2`

### Implementation for User Story 2

- [ ] T054 [US2] Implementar `src/componentes/Paginacion.jsx` ("Anterior", "Siguiente", "Página X de Y" debajo de la lista, solo con más de 50 movimientos) y hacer pasar T052
- [ ] T055 [US2] Agregar a `src/componentes/SeccionCuenta.jsx` la página actual guardada en la dirección (`/?pagina=N` con `useSearchParams`; sin valor o inválido = 1): navegación con `Paginacion`, "Añadir Gasto"/"Añadir Ingreso" abren el formulario con `?pagina=N`, vuelta a la página 1 tras un alta exitosa (FR-015), permanencia en la página actual si una operación falla o se cancela, y si la página pedida queda vacía y hay movimientos, mostrar la última página con movimientos (FR-014); cuando se muestra otra página que la pedida (vacía o número inválido), corregir la dirección a la página mostrada con `setSearchParams(..., { replace: true })`, sin agregar una entrada al historial
- [ ] T056 [US2] Ejecutar las pruebas de T051–T053 y corregir hasta que pasen

**Checkpoint**: US1 y US2 funcionan juntas y por separado.

---

## Phase 5: User Story 3 - Editar un movimiento (Priority: P2)

**Goal**: corregir monto, categoría, fecha o tipo de un movimiento y recalcular el saldo.

**Independent Test**: editar un gasto (monto, categoría, fecha y tipo) y verificar el movimiento
y el saldo.

### Tests for User Story 3 ⚠️

- [ ] T057 [P] [US3] Escribir `pruebas/integracion/editarMovimiento.test.js` contra `basp_editar_movimiento`, solo con categorías por defecto: AC-62 sin el cambio de categoría (monto y fecha; saldo 11.000), AC-63 (gasto → ingreso en "Pago Ingresado"; saldo 16.000), AC-37 (`creado_en` no cambia y el orden se mantiene), rechazos de AC-47, AC-48 y AC-49 parte edición (monto 0, −50, máximo, 10.555, categoría de otro tipo), `FECHA_INVALIDA`, `MOVIMIENTO_INEXISTENTE` para un id de otro usuario, y `p_simular_falla` en edición y en cambio de tipo sin cambios en movimiento ni saldo (AC-123)
- [ ] T058 [P] [US3] Ampliar `pruebas/unitarias/FormularioMovimiento.test.jsx` (modo edición, con categorías propias simuladas "Transporte", "Mercado" y "Sueldo"): cambiar de "Transporte" a "Mercado" envía la nueva categoría (AC-62); cambiar a "Ingreso" y elegir "Sueldo" envía tipo y categoría (AC-65); muestra "1.500,00" sin signo, la categoría y la fecha guardadas y el selector de tipo con el tipo actual (AC-60, AC-61, AC-UI-06); al cambiar a "Ingreso" la categoría pasa a "Pago Ingresado" y el selector muestra solo categorías de ingreso (AC-64); no hay opción "Eliminar" (AC-70)
- [ ] T059 [P] [US3] Escribir `pruebas/e2e/editarMovimiento.spec.js`: tocar la fila abre el menú "Editar"/"Eliminar" y se cierra tocando fuera (AC-69); AC-62 sin el cambio de categoría y AC-63 de punta a punta con "Movimiento actualizado con éxito."; calendario con la fecha guardada (AC-66); "Cancelar" y flecha no guardan (AC-06, AC-67) y al reabrir se ven los valores guardados (AC-97); AC-40 parte edición (vuelve a la página 1); con 120 movimientos, abrir la edición desde la página 2 y cancelar vuelve a "Página 2 de 3" (FR-021); si el movimiento se elimina por la API mientras el formulario está abierto, al guardar se vuelve a la sección Cuenta con "El movimiento ya no existe. La lista se actualizará." y, tras "Aceptar", el movimiento ya no está en la lista; abrir `/movimientos/<id inexistente>/editar` muestra el mismo mensaje y vuelve a la sección Cuenta (FR-024)

### Implementation for User Story 3

- [ ] T060 [US3] Crear `supabase/migrations/0003_editar_movimiento.sql` con `BASP_EDITAR_MOVIMIENTO(p_id_movimiento uuid, p_tipo text, p_monto numeric, p_id_categoria uuid, p_fecha date, p_simular_falla boolean DEFAULT false) RETURNS void` (`SECURITY DEFINER`, `SET search_path = ''`): bloquea la cuenta de `auth.uid()`; obtiene el movimiento de esa cuenta con `FOR UPDATE` (si no, `MOVIMIENTO_INEXISTENTE`); mismas validaciones que el alta; actualiza tipo, monto, categoría y fecha sin tocar `creado_en`; si `p_simular_falla` lanza `FALLA_SIMULADA`; ajusta el saldo con `−signo(tipo₀)·m₀ + signo(tipo₁)·m₁` (data-model.md). Permisos como en T039
- [ ] T061 [US3] (usuario) Ejecutar `supabase/migrations/0003_editar_movimiento.sql` en el SQL Editor
- [ ] T062 [US3] Agregar `EditarMovimiento({ idMovimiento, tipo, monto, idCategoria, fecha })` y `ObtenerMovimiento(idMovimiento)` en `src/servicios/movimientos.js`
- [ ] T063 [P] [US3] Implementar `src/componentes/SelectorTipo.jsx` ("Gasto"/"Ingreso", etiqueta "Tipo") y `src/componentes/MenuMovimiento.jsx` (diálogo con "Editar" y "Eliminar", se cierra con clic fuera o Esc) (FR-016)
- [ ] T064 [US3] Agregar el modo edición a `src/componentes/FormularioMovimiento.jsx`: título "Editar Movimiento", selector de tipo, al cambiar de tipo poner la categoría por defecto del nuevo tipo salvo que el usuario elija otra (FR-018), monto con `ConvertirMontoApiAEntrada`; hacer pasar T058
- [ ] T065 [US3] Agregar la ruta `/movimientos/:idMovimiento/editar` en `src/componentes/PantallaMovimiento.jsx`: carga el movimiento y las categorías con valores guardados cada vez (FR-017); si el movimiento no existe, muestra "El movimiento ya no existe. La lista se actualizará." y vuelve a `/?pagina=N` recargando; si su carga falla por otro motivo, muestra "No se pudieron cargar los movimientos. Vuelva a intentarlo." y vuelve a `/?pagina=N` (FR-024); al guardar con éxito vuelve a `/` en la página 1 y muestra "Movimiento actualizado con éxito."; "Cancelar" y la flecha vuelven a `/?pagina=N`; con `MOVIMIENTO_INEXISTENTE` cierra el formulario, vuelve a `/?pagina=N` y muestra "El movimiento ya no existe. La lista se actualizará."; al presionar "Aceptar" recarga el saldo y esa página
- [ ] T066 [US3] Conectar en `src/componentes/FilaMovimiento.jsx` y `src/componentes/SeccionCuenta.jsx` el clic o toque en la fila (también con Enter/Espacio) con `MenuMovimiento`, y "Editar" con la ruta de edición incluyendo la página actual (`?pagina=N`)
- [ ] T067 [US3] Ejecutar las pruebas de T057–T059 y corregir hasta que pasen

**Checkpoint**: US1, US2 y US3 funcionan.

---

## Phase 6: User Story 4 - Eliminar un movimiento (Priority: P3)

**Goal**: eliminar un movimiento con confirmación y recalcular el saldo.

**Independent Test**: eliminar un movimiento confirmando y cancelando, y verificar lista y saldo.

### Tests for User Story 4 ⚠️

- [ ] T068 [P] [US4] Escribir `pruebas/integracion/eliminarMovimiento.test.js` contra `basp_eliminar_movimiento`: AC-68 (ingreso de 1.000 eliminado, saldo de 5.000 a 4.000), `MOVIMIENTO_INEXISTENTE` con un id de otro usuario (y el movimiento de B sigue), `p_simular_falla` sin cambios (AC-123 parte eliminación)
- [ ] T069 [P] [US4] Escribir `pruebas/e2e/eliminarMovimiento.spec.js`: AC-71 (texto de confirmación; "Cancelar" no cambia nada), AC-68 con "Movimiento eliminado con éxito.", "Eliminando…" deshabilitado durante el proceso (FR-032), AC-40 parte eliminación (vuelve a la página 1); si el movimiento se elimina por la API con el menú abierto, al confirmar se muestra "El movimiento ya no existe. La lista se actualizará." y, tras "Aceptar", el movimiento ya no está en la lista

### Implementation for User Story 4

- [ ] T070 [US4] Crear `supabase/migrations/0004_eliminar_movimiento.sql` con `BASP_ELIMINAR_MOVIMIENTO(p_id_movimiento uuid, p_simular_falla boolean DEFAULT false) RETURNS void` (`SECURITY DEFINER`, `SET search_path = ''`): bloquea la cuenta de `auth.uid()`; obtiene el movimiento de esa cuenta (si no, `MOVIMIENTO_INEXISTENTE`); lo borra; si `p_simular_falla` lanza `FALLA_SIMULADA`; ajusta el saldo con `−signo(tipo)·m`. Permisos como en T039
- [ ] T071 [US4] (usuario) Ejecutar `supabase/migrations/0004_eliminar_movimiento.sql` en el SQL Editor
- [ ] T072 [US4] Agregar `EliminarMovimiento(idMovimiento)` en `src/servicios/movimientos.js`
- [ ] T073 [US4] Implementar `src/componentes/Confirmacion.jsx` (diálogo con texto, "Confirmar" que pasa a "Eliminando…" deshabilitado junto con "Cancelar" mientras procesa)
- [ ] T074 [US4] Conectar "Eliminar" de `MenuMovimiento` en `src/componentes/SeccionCuenta.jsx`: confirmación "¿Está seguro que desea eliminar este movimiento?", al confirmar elimina, recarga cuenta y página 1 y muestra "Movimiento eliminado con éxito."; si falla muestra "No se pudo eliminar el movimiento. Vuelva a intentarlo." y se queda en la página actual; si el error es `MOVIMIENTO_INEXISTENTE`, cierra la confirmación y muestra "El movimiento ya no existe. La lista se actualizará.", y al presionar "Aceptar" recarga el saldo y la página actual (si queda vacía, aplica FR-014)
- [ ] T075 [US4] Ejecutar las pruebas de T068–T069 y corregir hasta que pasen

**Checkpoint**: todas las operaciones sobre movimientos funcionan.

---

## Phase 7: User Story 5 - Aislamiento y consistencia de los datos (Priority: P1)

**Goal**: comprobar de forma integral que nadie accede a datos ajenos, que el cliente no puede
escribir directo y que el saldo nunca queda inconsistente.

**Independent Test**: con dos usuarios A y B, intentar desde la API leer y modificar datos de B
siendo A; simular fallas; ejecutar secuencias y operaciones simultáneas.

**Nota de orden**: es P1, pero va después de US4 porque prueba en conjunto las funciones de alta,
edición y eliminación. Cada función ya tiene sus pruebas de seguridad en su historia.

### Tests for User Story 5 ⚠️

- [ ] T076 [P] [US5] Escribir `pruebas/integracion/aislamiento.test.js`: AC-116 (A consulta cuentas, categorías, movimientos y `bav_movimientos` filtrando por ids de B → 0 filas); AC-117 (A edita y elimina vía RPC un movimiento de B → rechazado, B sin cambios); AC-118 (A crea un movimiento en su cuenta con una categoría de B → rechazado; saldos sin cambios); `insert`/`update`/`delete` directos en `bat_cuentas`, `bat_categorias` y `bat_movimientos` rechazados, incluido `update` del saldo propio (FR-034); A no puede editar ni eliminar "Pago Realizado" ni "Pago Ingresado" (FR-028, AC-96 parte servidor); un cliente sin sesión no puede leer ni llamar a ninguna `basp_*`
- [ ] T077 [P] [US5] Escribir `pruebas/integracion/consistencia.test.js`: AC-125 (secuencia fija de 20 altas, 20 ediciones —10 con cambio de tipo— y 10 eliminaciones intercaladas; después de cada operación `ObtenerSaldo` = `CalcularSaldoEsperado`); 20 altas simultáneas con `Promise.all` desde dos clientes del mismo usuario y saldo final exacto (FR-004); AC-123 completo con saldo 10.000 y gasto de 3.000 (alta, edición a 2000, cambio a ingreso y eliminación con falla simulada)
- [ ] T078 [P] [US5] Escribir `pruebas/e2e/fallasServidor.spec.js` con `page.route` respondiendo 500: alta, edición, eliminación, carga de la cuenta, carga de movimientos y carga de categorías muestran su texto de FR-024 con cruz roja, sin códigos ni stack traces; en alta, edición y eliminación el formulario queda abierto con los valores (AC-127 parte de esta feature, FR-020); en la carga de cuenta o movimientos "Aceptar" reintenta y, sin la falla, se ven saldo y lista; en la carga de categorías "Aceptar" vuelve a la sección Cuenta (FR-024); falla de `signInAnonymously` muestra la pantalla de FR-033 y "Aceptar" reintenta y entra a la cuenta. Esta prueba arranca con un navegador sin sesión (sin la sesión inyectada de T020) e intercepta con `page.route` la primera solicitud de inicio de sesión anónimo para que falle; la segunda la deja pasar agregándole al cuerpo `data: { es_prueba: true }` (`route.continue({ postData })`), para que el usuario que crea quede marcado y lo borre el script de limpieza (constitución II)

### Implementation for User Story 5

- [ ] T079 [US5] Ejecutar T076–T078; corregir migraciones (por ejemplo, permisos o políticas faltantes) o el cliente según lo que fallen. Cualquier cambio de SQL va en una migración nueva `supabase/migrations/0005_…sql` (no se reescriben migraciones ya ejecutadas) y se marca como (usuario) para ejecutarla

**Checkpoint**: seguridad e integridad verificadas contra la API.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: requisitos que abarcan todas las historias, rendimiento y cierre.

- [ ] T080 [P] Escribir `pruebas/e2e/anchosPantalla.spec.js`: en 320, 768, 1280 y 1920 px se pueden hacer alta, edición, eliminación y paginación sin desplazamiento horizontal, incluido un saldo de "USD 1.999.999.999.999,98" y una categoría de 30 caracteres simulada con `SimularCategorias` (SC-007, FR-030)
- [ ] T081 [P] Escribir `pruebas/e2e/contraste.spec.js`: axe sin violaciones de contraste en la sección Cuenta (vacía, con lista, cargando), formularios de alta y edición, calendario abierto, menú de fila, confirmación, mensajes de éxito y error, estados "Guardando…"/"Eliminando…" y pantalla de error de sesión (SC-008). Para la pantalla de error de sesión, arrancar sin sesión y hacer fallar el inicio de sesión anónimo con `page.route`, como en T078, sin dejar pasar ningún intento (así no se crea ningún usuario)
- [ ] T082 [P] Escribir `pruebas/e2e/teclado.spec.js`: alta, edición, eliminación y paginación completas solo con teclado (Tab, Enter, Espacio, Esc, flechas en el calendario) con foco visible en cada paso (SC-009, FR-036); íconos con texto alternativo "Éxito"/"Error"
- [ ] T083 [P] Crear `pruebas/rendimiento/cargarDatos.js` con `CrearUsuarioConMovimientos(cantidad)`: crea un usuario de prueba (`es_prueba`) y carga `cantidad` movimientos con `basp_agregar_movimiento` en tandas de 50 llamadas en paralelo, repartidos en fechas pasadas entre las categorías por defecto; al terminar verifica que el saldo sea igual a ingresos menos gastos. Sin scripts SQL ni pasos manuales
- [ ] T084 Escribir `pruebas/rendimiento/operaciones.spec.js`: con un usuario con 5.000 movimientos (creado con `CrearUsuarioConMovimientos(5000)` de T083, en un `beforeAll` con timeout amplio), CPU 4× (`Emulation.setCPUThrottlingRate`) y red emulada (10 Mbps, 100 ms), medir 100 altas, 100 ediciones y 100 eliminaciones desde la confirmación hasta ver lista y saldo actualizados, y verificar p95 < 2 s por tipo (SC-003, AC-115)
- [ ] T085 Corregir lo que fallen T080–T084 (estilos, foco, consultas)
- [ ] T086 Revisión de seguridad: `npm run lint` sin errores (incluye `no-console` en `src/`, FR-035); `npm audit` sin vulnerabilidades; buscar en el repo `service_role`, claves o `.env.local` versionado; confirmar que ningún mensaje de error muestra `error.message` (constitución III)
- [ ] T087 Ejecutar `npm test` completo (unitarias, integración y e2e) y dejarlo en verde; luego borrar los usuarios de prueba con `supabase/scripts/limpiar_usuarios_prueba.sql` (usuario)
- [ ] T088 Recorrer la validación manual de `specs/001-cuenta-movimientos/quickstart.md` (pasos 1 a 11, incluido el borrado de los usuarios anónimos de la validación) y registrar el resultado
- [ ] T089 Actualizar `AGENTS.md`: en "Stack", las librerías incorporadas sin versiones (react-router; react-day-picker + date-fns; Vitest + Testing Library + jsdom; Playwright + axe-core; ESLint; "las versiones están en package.json, siempre la última estable al incorporarlas"); en "Cómo correr", `npx playwright install chromium`, `npm run test:e2e`, `npm run test:rendimiento` y activar el inicio de sesión anónimo en Supabase; y corregir en "Cómo correr" la cantidad de usuarios anónimos que crea cada suite (integración, e2e y rendimiento), contándolos en la implementación real. **Revisar el cambio con el usuario antes de commitear** (plan.md, Cierre de la Feature)
- [ ] T090 Preguntar al usuario si desea commitear la feature y, si acepta, si desea mergear `001-cuenta-movimientos` a `main` y hacer push (constitución, Flujo de Desarrollo)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T008 (usuario) debe estar hecho antes de cualquier
  prueba de integración o e2e.
- **Foundational (Phase 2)**: depende de Setup. Bloquea todas las historias. T009–T015 son
  secuenciales (mismo archivo); T017 (usuario) cierra la parte de base de datos.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2 (Phase 4)**: depende de US1 (amplía `SeccionCuenta` y la lista).
- **US3 (Phase 5)**: depende de US1 (reutiliza el formulario y la lista). Puede hacerse en
  paralelo con US2 si se coordinan los cambios en `SeccionCuenta.jsx`.
- **US4 (Phase 6)**: depende de US3 (usa `MenuMovimiento`).
- **US5 (Phase 7)**: depende de US1, US3 y US4 (prueba las tres funciones de escritura).
- **Polish (Phase 8)**: depende de todas las historias.

### Within Each User Story

- Pruebas primero (deben fallar) → migración SQL → ejecución por el usuario → servicios →
  componentes → integración en pantallas → correr las pruebas.

### Parallel Opportunities

- Setup: T002–T006 en paralelo.
- Foundational: T016, T018, T020 y T021–T029 en paralelo con la escritura del SQL (T009–T015);
  T023/T025/T026/T027 son pares prueba-utilidad independientes.
- Cada historia: todas las tareas de pruebas marcadas [P] en paralelo; T041, T043, T044, T045 y
  T048 en paralelo dentro de US1.
- US2 y US3 en paralelo, con cuidado en `SeccionCuenta.jsx`.
- Polish: T080, T081, T082 y T083 en paralelo.

---

## Parallel Example: User Story 1

```text
# Pruebas de US1 en paralelo:
T032 pruebas/integracion/cuentaPorDefecto.test.js
T033 pruebas/integracion/agregarMovimiento.test.js
T034 pruebas/integracion/validacionesAgregarMovimiento.test.js
T035 pruebas/unitarias/CampoMonto.test.jsx
T036 pruebas/unitarias/FormularioMovimiento.test.jsx
T037 pruebas/e2e/registrarMovimientos.spec.js
T038 pruebas/e2e/formularioAlta.spec.js

# Componentes independientes de US1 en paralelo (después de T039–T042):
T043 src/componentes/EncabezadoCuenta.jsx
T044 src/componentes/CampoMonto.jsx
T045 src/componentes/SelectorCategoria.jsx + SelectorFecha.jsx
T048 src/componentes/FilaMovimiento.jsx + ListaMovimientos.jsx
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (Setup) y Phase 2 (Foundational), con las tareas (usuario) hechas.
2. Phase 3 (US1).
3. **Parar y validar**: pasos 1–3 y 6–7 del quickstart y pruebas de US1 en verde.
4. Se puede preguntar si se quiere un commit intermedio de este estado estable.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → validar → MVP.
3. US2 → lista completa con paginación.
4. US3 → edición.
5. US4 → eliminación.
6. US5 → verificación integral de seguridad y consistencia.
7. Polish → anchos, accesibilidad, rendimiento, revisión de seguridad, AGENTS.md.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Las tareas (usuario) requieren acceso al panel de Supabase; el agente no tiene ese acceso.
- Nunca reescribir una migración ya ejecutada: los cambios van en una migración nueva.
- Las pruebas de integración y e2e consumen sesiones anónimas (~30 por hora por IP): evitar
  correrlas en bucle.
- Ningún commit sin pruebas en verde ni sin confirmación del usuario.
- Categorías propias: en esta feature no se pueden crear, así que los escenarios que las usan se
  prueban con datos simulados (pruebas unitarias con categorías de prueba y `SimularCategorias`
  en e2e). Quedan para las pruebas de integración y e2e de la feature 002: el cambio de categoría
  dentro del mismo tipo (AC-62) y el cambio a una categoría propia de otro tipo (AC-65).
