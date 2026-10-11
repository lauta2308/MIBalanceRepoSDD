# Contrato: Interfaz

**Feature**: 001-cuenta-movimientos

Pantallas, rutas y textos fijos. Los formatos y colores vienen de `INTERFAZ.md`; los textos
exactos, de la spec.

## Rutas

| Ruta | Pantalla | Flecha para volver atrás |
|---|---|---|
| `/` | Sección Cuenta | No (RF-01) |
| `/movimientos/nuevo/gasto` | Formulario "Añadir Gasto" | Sí → `/` sin guardar |
| `/movimientos/nuevo/ingreso` | Formulario "Añadir Ingreso" | Sí → `/` sin guardar |
| `/movimientos/:idMovimiento/editar` | Formulario "Editar Movimiento" | Sí → `/` sin guardar |

Ruta desconocida → `/`. Antes de cualquier ruta se resuelve la sesión: "Cargando…" o, si falla,
la pantalla de error de FR-033.

## Sección Cuenta

| Elemento | Contenido |
|---|---|
| Encabezado | `<nombre> (<código>)` — ej. "Mi Cuenta (USD)" |
| Saldo | `<código> <monto>` — verde > 0, rojo < 0, color normal = 0; nunca se corta |
| Botones | "Añadir Gasto", "Añadir Ingreso" |
| Lista | Grupos por fecha "DD/MM/AAAA"; fila: categoría a la izquierda, monto con signo a la derecha |
| Vacía | "Aquí verá sus movimientos." |
| Paginación (> 50) | "Anterior", "Siguiente", "Página X de Y" |
| Cargando | "Cargando…" en lugar del saldo y de la lista |

## Formulario de movimiento

| Elemento | Alta | Edición |
|---|---|---|
| Título | "Añadir Gasto" / "Añadir Ingreso" | "Editar Movimiento" |
| Tipo | — | Selector "Gasto" / "Ingreso" |
| Monto | Vacío | Valor guardado sin signo ("1.500,00") |
| Categoría | Por defecto del tipo | Guardada |
| Fecha | Hoy | Guardada |
| Botones | "Guardar", "Cancelar" | "Guardar", "Cancelar" (sin "Eliminar") |
| Procesando | "Guardando…" deshabilitado; "Cancelar" y flecha deshabilitados | ídem |

## Diálogos (`<dialog>` modal)

| Diálogo | Texto | Botones |
|---|---|---|
| Menú de fila | — | "Editar", "Eliminar" (se cierra tocando fuera o con Esc) |
| Confirmar eliminación | "¿Está seguro que desea eliminar este movimiento?" | "Confirmar" ("Eliminando…" al procesar), "Cancelar" |
| Mensaje de éxito | Texto de FR-022, ícono tic verde (`aria-label="Éxito"`) | "Aceptar" |
| Mensaje de error | Texto de FR-010 / FR-024, ícono cruz roja (`aria-label="Error"`) | "Aceptar" |
| Error de sesión | "No se pudo iniciar sesión. Vuelva a intentarlo." | "Aceptar" (reintenta) |

## Formato de montos (`utilidades/montos.js`)

| Función | Entrada → Salida |
|---|---|
| `FormatearMonto` | `"1500.5"` → `"1.500,50"`; `"-1000"` → `"-1.000,00"` |
| `FormatearMontoConSigno` | (`"1500.00"`, `'GASTO'`) → `"-1.500,00"`; (`"1000.00"`, `'INGRESO'`) → `"+1.000,00"` |
| `FiltrarEntradaMonto` | `"abc50"` → `"50"`; `"10,555"` → `"10,55"`; `"$1.500,50"` → `"1.500,50"`; `"007"` → `"7"`; `",5"` → `"0,5"` |
| `ConvertirEntradaAMontoApi` | `"1.500,5"` → `"1500.50"`; `"1500,"` → `"1500.00"`; `""` → `null` |
| `ConvertirMontoApiAEntrada` | `"1500.00"` → `"1.500,00"`; `"1500.50"` → `"1.500,50"`; `"0.10"` → `"0,10"` (sin signo, para el formulario de edición) |
| `ValidarMonto` | `null`/`"0.00"` → "El monto debe ser mayor a 0."; `"1000000000000.00"` → "El monto máximo es 999.999.999.999,99." |

## Fechas (`utilidades/fechas.js`)

| Función | Comportamiento |
|---|---|
| `ObtenerFechaHoy` | `"AAAA-MM-DD"` con la fecha local del dispositivo |
| `FormatearFecha` | `"2026-09-17"` → `"17/09/2026"` (partiendo la cadena) |
| `ConvertirTextoAFechaLocal` / `ConvertirFechaLocalATexto` | Para el calendario, sin `toISOString()` ni `new Date("AAAA-MM-DD")` |
