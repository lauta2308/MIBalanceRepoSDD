# MiBalance Constitution

## Core Principles

### I. Alcance Estricto del PRD

- Toda feature, pantalla, campo o comportamiento implementado DEBE estar respaldado por un
  requerimiento (RF, RNF o UI) de `PRD.md` o `INTERFAZ.md`.
- NO se DEBE implementar nada listado en "Fuera de Alcance" del PRD. En particular: múltiples
  cuentas por usuario, transferencias entre cuentas, soporte multi-idioma o librerías de
  internacionalización (la interfaz es solo en español), y autenticación con contraseña propia o
  almacenamiento de credenciales.
- Si una feature parece necesitar algo que el PRD no cubre, se DEBE consultar al usuario antes de
  implementarlo; nunca se agrega "por las dudas".

**Razón**: el PRD es el contrato del producto. Lo que no está en él agrega código para mantener,
superficie de errores y desvía el esfuerzo del objetivo (detectar el "gasto hormiga").

### II. Pruebas Obligatorias y Cero Regresiones

- Toda feature nueva DEBE tener pruebas automatizadas que cubran sus criterios de aceptación
  (AC) del PRD antes de considerarse terminada.
- Antes de cerrar una feature, se DEBE correr la suite completa (`npm test`), no solo las pruebas
  nuevas. Una feature que rompe pruebas existentes o introduce inconsistencias en otra parte de la
  aplicación NO está terminada.
- Los requerimientos de seguridad e integridad (RNF-03, RNF-05) DEBEN verificarse con pruebas que
  accedan directamente a la API de Supabase, sin pasar por la interfaz.
- Los datos que crean las pruebas DEBEN quedar identificados (`es_prueba = true`) y ser
  eliminables con el script de limpieza.

**Razón**: la app maneja dinero; un error silencioso en el saldo o en el aislamiento de datos
destruye la confianza del usuario. Las pruebas son la única forma de garantizar que lo que ya
funcionaba sigue funcionando.

### III. Seguridad y Privacidad de los Datos (NO NEGOCIABLE)

- Ningún usuario DEBE poder leer, crear, editar ni eliminar cuentas, categorías o movimientos de
  otro usuario (RNF-03). El aislamiento se DEBE garantizar en la base de datos con políticas RLS
  en todas las tablas, no solo en la interfaz.
- Las operaciones que el cliente no debe poder hacer (por ejemplo, modificar la lista de monedas)
  DEBEN estar bloqueadas por RLS o permisos, no solo ocultas en la interfaz.
- NO se DEBEN subir al repositorio claves, tokens ni secretos. Solo las variables públicas
  `VITE_*` (URL y clave anónima de Supabase) pueden llegar al cliente; la clave `service_role`
  NUNCA se usa en el código de la aplicación. Los valores reales viven en `.env.local`, que no se
  versiona; `.env.example` documenta las variables sin valores reales.
- Los mensajes de error al usuario NO DEBEN exponer detalles técnicos (códigos internos, stack
  traces, consultas SQL) (RNF-07), y no se DEBEN registrar datos financieros de los usuarios en
  logs ni en la consola.
- Cada feature DEBE revisarse en busca de vulnerabilidades antes de cerrarse.
- La autenticación se hace exclusivamente con proveedores de Supabase Auth. El inicio de sesión
  anónimo es temporal y DEBE quedar aislado para reemplazarlo por Google OAuth (RF-22, RF-23) sin
  tocar la lógica de movimientos.

**Razón**: se trata de información financiera personal. Una filtración entre usuarios o una clave
expuesta es el peor fallo posible del producto.

### IV. Integridad Financiera (NO NEGOCIABLE)

- Los montos y saldos DEBEN almacenarse y procesarse como `numeric`/decimal con al menos dos
  decimales; NUNCA como float (RNF-04). El saldo no tiene tope de dígitos enteros.
- Toda operación que modifique movimientos o el saldo (alta, edición, cambio de tipo,
  eliminación, restablecimiento de cuenta) DEBE ser atómica en la base de datos: ante una falla,
  todo queda exactamente como estaba (RNF-05). En todo momento el saldo DEBE ser igual a la suma
  de ingresos menos la suma de gastos.
- Ningún movimiento puede quedar sin categoría: si el usuario no elige una, se usan las
  categorías por defecto "Pago Realizado" (gasto) y "Pago Ingresado" (ingreso) (RF-35, RF-36).
- La fecha de un movimiento es un día calendario (`date` en SQL, `"AAAA-MM-DD"` en JS), nunca
  un instante: NO se convierte a UTC. "Hoy" se calcula con la fecha local del dispositivo.
- Los dos tipos de movimiento son **ingreso** y **gasto** (`'INGRESO'` y `'GASTO'` en la base de
  datos). El término "egreso" no se usa en ningún lado.

**Razón**: un saldo que no cuadra o una fecha corrida un día invalida todos los reportes, que son
el propósito de la aplicación.

### V. Dependencias en su Última Versión Estable

- Toda librería, framework, plugin o herramienta que se agregue DEBE usarse en su última versión
  estable al momento de incorporarla (no betas, release candidates ni versiones deprecadas).
- Antes de agregar una dependencia se DEBE verificar que sea necesaria (preferir la plataforma o
  lo que ya está en el proyecto) y que no tenga vulnerabilidades conocidas (`npm audit`).
- Si una dependencia no puede usarse en su última versión estable (incompatibilidad, bug
  conocido), la excepción y su motivo DEBEN documentarse en el plan de la feature.

**Razón**: las versiones actuales reciben parches de seguridad y evitan migraciones grandes y
forzadas más adelante.

## Restricciones Técnicas y Convenciones

- **Stack**: React + Vite en el cliente, Supabase (cliente JS directo, sin backend propio) y
  PostgreSQL. Node 22.12 o superior. Las versiones concretas se rigen por el principio V.
- **Lógica crítica en la base de datos**: las operaciones que deben ser atómicas (principio IV)
  se implementan como funciones SQL llamadas por RPC (`BASP_*`), no como varias llamadas
  sucesivas desde el cliente.
- **Idioma**: todo el código propio, la base de datos y la interfaz van en español. La interfaz
  trata al usuario de **usted**.
- **Diseño adaptable**: la interfaz DEBE funcionar sin pérdida de funcionalidad entre 320px y
  1920px de ancho (RNF-06).
- **Convenciones detalladas**: los nombres de código, objetos de base de datos, mayúsculas de la
  interfaz y comandos para correr el proyecto están en `AGENTS.md`, que es la guía operativa y
  DEBE respetarse.

## Flujo de Desarrollo

1. Cada feature parte de un requerimiento del PRD (principio I) y sigue el flujo de Spec Kit:
   especificar → planificar → generar tareas → implementar.
2. El plan de cada feature DEBE incluir un chequeo explícito contra los cinco principios.
3. La feature se considera terminada solo cuando sus pruebas y la suite completa pasan
   (principio II) y fue revisada en seguridad (principio III).
4. Una vez terminada y probada, se DEBE **preguntar al usuario si desea hacer el commit**. Nunca
   se commitea sin su confirmación. El objetivo es que cada feature estable quede en su propio
   commit para poder volver a esa versión si la siguiente falla.
5. Los commits siguen el formato de la skill `conventional-commit` del proyecto. No se
   commitean trabajos a medio hacer ni con pruebas fallando.

## Governance

- Esta constitución prevalece sobre cualquier otra práctica o guía del proyecto. Ante un
  conflicto con `AGENTS.md`, manda la constitución y se corrige `AGENTS.md`.
- **Enmiendas**: se proponen con `/speckit-constitution`, requieren la aprobación del usuario y
  deben dejar registrado el cambio de versión y su motivo.
- **Versionado** (semántico):
  - MAJOR: se elimina o redefine un principio de forma incompatible.
  - MINOR: se agrega un principio o sección, o se amplía materialmente una regla.
  - PATCH: aclaraciones, redacción o correcciones sin cambio de significado.
- **Cumplimiento**: cada plan (`/speckit-plan`) y cada análisis (`/speckit-analyze`) DEBE
  verificar el cumplimiento de estos principios. Cualquier excepción DEBE justificarse por
  escrito en el plan de la feature.

**Version**: 1.0.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
