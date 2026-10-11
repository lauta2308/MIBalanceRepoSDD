# Quickstart: Cuenta y Movimientos

**Feature**: 001-cuenta-movimientos

Guía para levantar la feature y comprobar que funciona de punta a punta. Detalles de datos en
[data-model.md](data-model.md); de la API, en [contracts/supabase.md](contracts/supabase.md).

## Requisitos previos

1. Node 22.12 o superior (`node -v`).
2. Un proyecto de Supabase con:
   - **Authentication → Sign In / Providers → Allow anonymous sign-ins** activado.
   - Las migraciones de `supabase/migrations/` ejecutadas **en orden** en el SQL Editor.
3. `.env.local` en la raíz, copiado de `.env.example`:

   ```text
   VITE_SUPABASE_URL=https://<proyecto>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<clave publishable o anon>
   ```

   Nunca la clave secreta / service_role (constitución III).

## Correr

```bash
npm install
npx playwright install chromium   # una sola vez
npm run dev                        # http://localhost:5173
npm test                           # unitarias + integración + punta a punta
```

Scripts por separado: `npm run test:unitarias`, `npm run test:integracion`,
`npm run test:e2e`, `npm run test:rendimiento` (este último no está en `npm test`).

Después de correr las pruebas, borrar los usuarios de prueba con
`supabase/scripts/limpiar_usuarios_prueba.sql` en el SQL Editor.

## Validación manual (5 minutos)

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la app en una ventana privada | "Mi Cuenta (USD)", "USD 0,00", "Aquí verá sus movimientos." |
| 2 | "Añadir Gasto" → escribir `1500,50` → "Guardar" | El campo mostró "1.500,50"; aparece "Gasto registrado con éxito." con tic verde; tras "Aceptar", la lista muestra hoy "Pago Realizado -1.500,50" en rojo y el saldo "USD -1.500,50" en rojo |
| 3 | "Añadir Ingreso" → `2000` → "Guardar" → "Aceptar" | Saldo "USD 499,50" en verde; el ingreso aparece primero |
| 4 | Tocar la fila del gasto → "Editar" → tipo "Ingreso" → "Guardar" | Categoría "Pago Ingresado", "+1.500,50", saldo "USD 3.500,50" |
| 5 | Tocar una fila → "Eliminar" → "Cancelar"; luego "Eliminar" → "Confirmar" | Primero no cambia nada; después desaparece y el saldo se recalcula |
| 6 | En "Añadir Gasto", escribir `0` → "Guardar" | "El monto debe ser mayor a 0." con cruz roja; nada se registra |
| 7 | Abrir el calendario | En español, semana desde el lunes, hoy seleccionado, días futuros deshabilitados |
| 8 | Repetir 2–5 solo con el teclado (Tab, Enter, Esc) | Todo es posible y el foco siempre se ve |
| 9 | DevTools en 320px de ancho | Sin desplazamiento horizontal |
| 10a | DevTools → Network request blocking → bloquear `*.supabase.co` → recargar | "No se pudieron cargar los movimientos. Vuelva a intentarlo." con cruz roja, sin saldo ni lista; desbloquear y "Aceptar" → se ven el saldo y la lista |
| 10b | En la misma pestaña y con el bloqueo activo: DevTools → Application → Storage → "Clear site data", y recargar (no usar otra ventana privada: comparten la sesión) | "No se pudo iniciar sesión. Vuelva a intentarlo."; desbloquear y "Aceptar" → entra a "Mi Cuenta (USD)" |
| 11 | En Supabase → Authentication → Users, borrar los usuarios anónimos creados en esta validación (los 2 más recientes, sin `es_prueba`) | No quedan datos de la validación en la base (constitución II); el script de limpieza no los borra porque no están marcados |

## Qué cubren las pruebas automáticas

| Suite | Carpeta | Cubre |
|---|---|---|
| Unitarias | `pruebas/unitarias/` | Formato y filtro de montos, fechas, orden de categorías, traducción de errores, componentes (formulario, lista, paginación) |
| Integración | `pruebas/integracion/` | Contra Supabase real: cuenta por defecto (AC-09), altas/ediciones/eliminaciones y saldo, validaciones del servidor (AC-49), aislamiento A/B (AC-116..118), fallas simuladas (AC-123), secuencia de 50 operaciones (AC-125), precisión (AC-121, AC-122) |
| Punta a punta | `pruebas/e2e/` | Escenarios de la spec en el navegador, mensajes, errores 500 simulados (AC-127), anchos 320/768/1280/1920 (SC-007), contraste con axe (SC-008), teclado (SC-009) |
| Rendimiento | `pruebas/rendimiento/` | SC-003: p95 < 2 s con 5.000 movimientos, CPU 4× (la prueba carga sus propios datos; tarda unos minutos) |
