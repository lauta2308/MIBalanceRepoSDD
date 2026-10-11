# Feature Specification: Cuenta y Movimientos

**Feature Branch**: `001-cuenta-movimientos`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "@PRD.md" — primera de cinco features en que se divide el PRD (ver
"Mapa de features" en Assumptions). Cubre el núcleo: la cuenta por defecto, el saldo y el alta,
la edición y la eliminación de movimientos.

## Clarifications

### Session 2026-10-10

- Q: ¿Qué pasa si el usuario presiona "Guardar" o "Confirmar" dos veces seguidas o mientras la
  operación anterior se procesa? → A: El botón queda deshabilitado con "Guardando…" o
  "Eliminando…" y el formulario no se puede editar ni cerrar hasta que termine; cada
  confirmación registra una sola operación.
- Q: ¿Cuál es la fecha máxima que acepta el servidor para un movimiento? → A: Hasta la fecha de
  mañana según la hora universal (UTC), que cubre el "hoy" de todas las zonas horarias.
- Q: ¿Qué ve el usuario si no se puede iniciar la sesión temporal al abrir la aplicación? → A:
  Solo el mensaje "No se pudo iniciar sesión. Vuelva a intentarlo." con cruz roja y el botón
  "Aceptar", que reintenta iniciar la sesión; la sección Cuenta no se muestra hasta que la sesión
  se inicie. (Revisado en la revisión formal, CHK023: se usa "Aceptar" como en RF-104.)
- Q: ¿La spec exige uso con teclado y lector de pantalla? → A: Sí, como mínimo: todas las
  acciones se pueden hacer con teclado, el foco es visible y los íconos tienen texto alternativo.
- Q: ¿Hay una fecha mínima para un movimiento? → A: No; el PRD no la define.

## User Scenarios & Testing *(mandatory)*

En los escenarios, "hoy" es el sábado 03/10/2026 y los montos se muestran en formato argentino
(punto de miles, coma decimal). Las categorías propias que aparecen en los escenarios ("Mercado",
"Sueldo", etc.) se simulan en las pruebas, porque crearlas es la feature 002. Por eso, el cambio a
una categoría propia (US3, escenarios 3 y 4) se verifica en esta feature con datos simulados, y
contra el servidor en la feature 002.

### User Story 1 - Ver el saldo y registrar gastos e ingresos (Priority: P1)

Un usuario nuevo entra a la aplicación y ve su cuenta "Mi Cuenta" con saldo USD 0,00. Desde la
sección Cuenta registra un gasto o un ingreso indicando monto, categoría y fecha, y el saldo se
actualiza al instante. Con la categoría y la fecha por defecto, registrar un gasto le lleva tres
interacciones: "Añadir Gasto" → monto → "Guardar".

**Why this priority**: es el corazón del producto (O-1). Sin registrar movimientos y ver el saldo
no hay nada que analizar; por sí sola ya le da valor al usuario.

**Independent Test**: con un usuario recién creado, registrar un gasto y un ingreso y comprobar
que el saldo refleja ambos; registrar montos inválidos y comprobar que se rechazan.

**Acceptance Scenarios**:

1. **Given** un usuario que acaba de registrarse, **When** accede a la sección Cuenta, **Then**
   ve una única cuenta con el encabezado "Mi Cuenta (USD)", el saldo "USD 0,00" y el mensaje
   "Aquí verá sus movimientos." en lugar de la lista. (AC-09, AC-42, AC-UI-13)
2. **Given** el usuario A con saldo USD 10.000,00 y una categoría de gastos "Mercado", **When**
   presiona "Añadir Gasto", ingresa 1500, selecciona "Mercado", deja la fecha de hoy y presiona
   "Guardar", **Then** la lista muestra bajo la fecha de hoy "Mercado" con "-1.500,00" en rojo, el
   saldo pasa a "USD 8.500,00" y se muestra "Gasto registrado con éxito." con un tic verde y el
   botón "Aceptar". (AC-43, AC-111, AC-UI-05, AC-UI-15)
3. **Given** el usuario A con saldo USD 10.000,00 y una categoría de ingresos "Sueldo", **When**
   añade un ingreso de 1000 en "Sueldo" con la fecha de hoy, **Then** la lista muestra "+1.000,00"
   en verde, el saldo pasa a "USD 11.000,00" y se muestra "Ingreso registrado con éxito.". (AC-44)
4. **Given** el usuario A con saldo USD 10.000,00, **When** intenta guardar un gasto con el monto
   vacío o 0, **Then** no se registra, se muestra "El monto debe ser mayor a 0." con una cruz roja
   y el saldo sigue en USD 10.000,00. (AC-45, AC-112)
5. **Given** el usuario A con saldo USD 0,00, **When** intenta guardar un ingreso de
   1.000.000.000.000,00 y después uno de 999.999.999.999,99, **Then** el primero se rechaza con "El
   monto máximo es 999.999.999.999,99." y el segundo se registra con saldo
   "USD 999.999.999.999,99". (AC-46)
6. **Given** el usuario A en "Añadir Gasto", **When** escribe "10,555", "-50", "abc50",
   "1500000" o "1500,50" en el monto, **Then** el campo muestra "10,55", "50", "50", "1.500.000" y
   "1.500,50" respectivamente; y con saldo USD 10.000,00, al guardar "1500,50" con la categoría y
   la fecha por defecto, la lista muestra "-1.500,50" y el saldo pasa a "USD 8.499,50". (AC-50,
   AC-51, AC-52, AC-UI-01, AC-UI-03)
7. **Given** el usuario A, **When** abre "Añadir Gasto" o "Añadir Ingreso", **Then** la categoría
   preseleccionada es "Pago Realizado" o "Pago Ingresado" respectivamente, la fecha es la de hoy,
   el calendario permite elegir solo una fecha (sin hora), no permite días posteriores a hoy ni
   dejar la fecha vacía, y el selector de categoría muestra solo categorías del mismo tipo, sin
   opción vacía. (AC-53..AC-56)
8. **Given** el usuario A con las categorías de gastos "Transporte", "café" y "Mercado", **When**
   abre el selector de categoría de "Añadir Gasto", **Then** las opciones aparecen en el orden
   "Pago Realizado", "café", "Mercado", "Transporte". (AC-58)
9. **Given** el usuario A que en "Añadir Ingreso" ingresó 500, eligió "Sueldo" y cambió la fecha
   a 01/10/2026, **When** cancela (con "Cancelar" o la flecha para volver atrás) o guarda y vuelve
   a abrir "Añadir Ingreso", **Then** el formulario muestra el monto vacío, "Pago Ingresado" y la
   fecha de hoy; si canceló, no se registró nada y el saldo no cambió. (AC-05, AC-57, AC-67)
10. **Given** el usuario A con saldo USD 1.000,00, **When** registra un gasto de 2000, **Then** se
    registra y el saldo es "USD -1.000,00" en rojo. (AC-59, AC-UI-02)
11. **Given** el usuario A con saldo 0, **When** registra ingresos de 0,10 y 0,20, **Then** el
    saldo es exactamente "USD 0,30"; y con dos ingresos de 999.999.999.999,99 el saldo es
    exactamente "USD 1.999.999.999.999,98". (AC-121, AC-122)

---

### User Story 2 - Consultar la lista de movimientos (Priority: P2)

El usuario ve en la sección Cuenta sus movimientos agrupados por fecha, del más reciente al más
antiguo, de a 50 por página, para revisar en qué gastó.

**Why this priority**: sin la lista el usuario no puede verificar lo que registró ni elegir qué
editar o eliminar; depende de US1 para tener datos.

**Independent Test**: cargar cuentas con 0, 30 y 120 movimientos y verificar el orden, los
grupos por fecha y la paginación.

**Acceptance Scenarios**:

1. **Given** el usuario A con un gasto de 1.500 en "Mercado" del 17/09/2026, un ingreso de 50.000
   en "Sueldo" del 01/10/2026 y luego un gasto de 800 en "Café" del 01/10/2026, **When** accede a
   la sección Cuenta, **Then** ve primero el grupo "01/10/2026" con "Café" seguido de "Sueldo", y
   después el grupo "17/09/2026" con "Mercado"; cada fila muestra la categoría a la izquierda y el
   monto con signo a la derecha, sin el tipo ni el código de moneda. (AC-36, AC-UI-04, AC-UI-14)
2. **Given** el usuario A con 120 movimientos, **When** accede a la sección Cuenta y presiona
   "Siguiente" dos veces, **Then** ve primero los 50 más recientes con "Página 1 de 3" y
   "Anterior" deshabilitado, luego los movimientos 51 a 100 con "Página 2 de 3", y por último los
   20 más antiguos con "Página 3 de 3" y "Siguiente" deshabilitado. (AC-38, AC-39)
3. **Given** el usuario A con 30 movimientos, **When** accede a la sección Cuenta, **Then** ve los
   30 y no se muestran los botones de paginación ni el indicador de página. (AC-41)
4. **Given** el usuario A con 120 movimientos en la página 2, **When** añade un gasto con fecha de
   hoy, edita o elimina un movimiento de esa página, **Then** la lista vuelve a la página 1 y, en
   el alta, el gasto nuevo aparece primero. (AC-40)

---

### User Story 3 - Editar un movimiento (Priority: P2)

El usuario corrige el monto, la categoría, la fecha o el tipo de un movimiento ya registrado, y el
saldo se recalcula.

**Why this priority**: los errores de carga son frecuentes; sin edición el saldo y los reportes
quedan mal para siempre.

**Independent Test**: editar un gasto existente (monto, categoría, fecha y tipo) y verificar el
movimiento resultante y el saldo.

**Acceptance Scenarios**:

1. **Given** el usuario A con un movimiento en la lista, **When** presiona su fila (toque o
   clic), **Then** se muestra un menú con "Editar" y "Eliminar". (AC-69)
2. **Given** un gasto de 1.500 en "Mercado" del 17/09/2026, **When** elige "Editar", **Then** el
   formulario muestra el monto "1.500,00" sin signo, "Mercado", la fecha 17/09/2026 preseleccionada
   en el calendario (con los días posteriores a hoy deshabilitados), un selector de tipo con "Gasto"
   seleccionado, el botón "Guardar" y ninguna opción para eliminar. (AC-60, AC-61, AC-66, AC-70,
   AC-UI-06)
3. **Given** un saldo de USD 10.000,00 que incluye un gasto de 3.000 en "Transporte" del
   17/09/2026, **When** lo edita a 2000, "Mercado" y 16/09/2026, **Then** la lista lo muestra bajo
   16/09/2026 con "Mercado" y "-2.000,00", el saldo queda en USD 11.000,00 y se muestra
   "Movimiento actualizado con éxito.". (AC-62)
4. **Given** un saldo de USD 10.000,00 que incluye un gasto de 3.000 en "Mercado", **When** cambia
   el tipo a ingreso sin elegir categoría y guarda, **Then** queda como ingreso en "Pago Ingresado"
   con "+3.000,00" y el saldo es USD 16.000,00; si en cambio elige la categoría de ingresos
   "Sueldo", queda en "Sueldo" con el mismo saldo. Al cambiar el tipo, el selector de categoría
   muestra solo las categorías del nuevo tipo. (AC-63, AC-64, AC-65)
5. **Given** un saldo de USD 10.000,00 que incluye un gasto de 3.000, **When** edita el monto a 0,
   lo deja vacío o lo pone en 1.000.000.000.000,00 y guarda, **Then** no se guarda, se muestra el
   mensaje de validación correspondiente y el gasto sigue en "-3.000,00". (AC-47, AC-48)
6. **Given** un gasto de 3.000 en "Mercado", **When** abre la edición, cambia el monto a 2000 y
   cancela (con "Cancelar" o la flecha para volver atrás) y luego vuelve a abrir la edición,
   **Then** no se guardó nada y el formulario muestra "3.000,00" con "Mercado". (AC-06, AC-67,
   AC-97)
7. **Given** un gasto en "Café" y, dado de alta después, un gasto en "Mercado", ambos del
   01/10/2026, **When** edita el monto de "Café", **Then** "Mercado" sigue antes que "Café". (AC-37)

---

### User Story 4 - Eliminar un movimiento (Priority: P3)

El usuario elimina un movimiento cargado por error, previa confirmación, y el saldo se recalcula.

**Why this priority**: es menos frecuente que editar; un movimiento erróneo también puede
corregirse editándolo.

**Independent Test**: eliminar un movimiento confirmando y cancelando, y verificar lista y saldo.

**Acceptance Scenarios**:

1. **Given** un saldo de USD 5.000,00 que incluye un ingreso de 1.000, **When** elige "Eliminar"
   en el menú de su fila, **Then** se muestra "¿Está seguro que desea eliminar este movimiento?"
   con "Confirmar" y "Cancelar"; si cancela, el movimiento sigue y el saldo sigue en USD 5.000,00.
   (AC-71)
2. **Given** la misma situación, **When** confirma, **Then** el movimiento desaparece, el saldo
   queda en USD 4.000,00 y se muestra "Movimiento eliminado con éxito.". (AC-68)

---

### User Story 5 - Aislamiento y consistencia de los datos (Priority: P1)

Cada usuario accede solo a sus propios datos, y el saldo nunca queda inconsistente, aunque una
operación falle a la mitad o alguien intente operar directamente contra el servidor sin pasar por
la interfaz.

**Why this priority**: es no negociable según la constitución (principios III y IV); un fallo acá
compromete datos financieros personales.

**Independent Test**: con dos usuarios A y B, intentar desde el servidor (sin interfaz) leer y
modificar datos de B siendo A, y simular fallas a mitad de las operaciones de A.

**Acceptance Scenarios**:

1. **Given** los usuarios A y B con cuenta, categorías y movimientos, **When** A consulta, edita o
   elimina directamente en el servidor la cuenta, categorías o movimientos de B, o crea un
   movimiento en la cuenta de B o en la suya con una categoría de B, **Then** no obtiene ningún
   registro, todas las operaciones se rechazan y los datos y saldos de ambos quedan sin cambios.
   (AC-116, AC-117, AC-118)
2. **Given** el usuario A con saldo USD 10.000,00 y un gasto de 3.000, **When** intenta
   directamente en el servidor registrar o editar un gasto con monto 0, -50,
   1.000.000.000.000,00 o 10,555, o con una categoría de ingresos, **Then** se rechazan todas las
   operaciones y el saldo sigue en USD 10.000,00. (AC-49)
3. **Given** el usuario A con saldo USD 10.000,00 que incluye un gasto de 3.000, **When** se
   simula una falla a mitad del alta de un gasto, de la edición de ese gasto, de su cambio a
   ingreso o de su eliminación, **Then** en los cuatro casos todo queda como antes, el saldo sigue
   en USD 10.000,00 y se muestra un mensaje de error en español, tratando de usted y sin detalles
   técnicos. (AC-123; AC-127 parcial: aquí se cubren las operaciones de movimientos, la carga
   de la lista, la carga de categorías y el inicio de sesión; el resto es de otras features)
4. **Given** el usuario A con saldo 0, **When** se ejecuta una secuencia fija de 20 altas, 20
   ediciones (10 con cambio de tipo) y 10 eliminaciones, **Then** después de cada operación el
   saldo es igual a la suma de ingresos menos la suma de gastos. (AC-125)
5. **Given** el usuario A, **When** intenta directamente en el servidor editar o eliminar las
   categorías "Pago Realizado" o "Pago Ingresado", **Then** se rechaza. (AC-96, parcial: la
   parte de la interfaz, con "Editar" y "Eliminar" deshabilitados, es de la feature 002)

---

### Edge Cases

- Doble clic en "Guardar" o "Confirmar": el segundo clic no tiene efecto porque el botón queda
  deshabilitado ("Guardando…" o "Eliminando…") hasta que termina la operación; se registra un
  solo movimiento (FR-032).
- Gasto mayor que el saldo: se permite y el saldo queda negativo (en rojo).
- Monto en el límite: 999.999.999.999,99 se acepta; un centavo más se rechaza. La suma de muchos
  movimientos al tope no desborda el saldo.
- Fecha: "hoy" es la fecha local del dispositivo. Una fecha registrada nunca se corre de día por
  la zona horaria, ni al guardarla ni al mostrarla.
- Fecha antigua: no hay fecha mínima para un movimiento; el calendario permite ir a cualquier año
  pasado.
- Monto ingresado de forma incompleta o pegado: "1500," se guarda como 1.500,00; ",50" se
  completa a "0,50"; "0,5" se guarda como 0,50; los ceros a la izquierda se quitan ("007" muestra
  "7"); al pegar se aplica el mismo filtro que al escribir ("$1.500,50" muestra "1.500,50").
- Fecha futura enviada directamente al servidor (salteando el calendario): se rechaza toda fecha
  posterior a la de mañana según la hora universal (UTC). Ese margen garantiza que nunca se
  rechace el "hoy" real de un usuario en cualquier zona horaria.
- Cambio de tipo en la edición con una categoría elegida del tipo anterior: se reemplaza por la
  categoría por defecto del nuevo tipo, salvo que el usuario elija otra del nuevo tipo.
- Eliminar el único movimiento de la última página: la lista vuelve a la página 1 y el indicador
  se recalcula; si quedan 50 o menos, desaparece la paginación.
- Un movimiento editado o eliminado desde otra pestaña o dispositivo: la operación sobre un
  movimiento que ya no existe cierra el formulario o la confirmación y muestra "El movimiento ya no existe. La lista se actualizará."
  con una cruz roja; al presionar "Aceptar" se recargan el saldo y la página actual (si queda
  vacía, se aplica FR-014).
- Operaciones simultáneas del mismo usuario desde dos pestañas o dispositivos: el saldo sigue
  igual a ingresos menos gastos.
- La página actual queda vacía porque se eliminaron movimientos desde otro dispositivo: se
  muestra la última página que tenga movimientos.
- Saldo o nombre de categoría largos en 320px: pasan a otra línea o se achica la letra, pero los
  montos nunca se cortan ni generan desplazamiento horizontal.
- Falla al iniciar la sesión temporal (sin conexión o límite de sesiones anónimas superado): se
  muestra el mensaje de error con "Aceptar", que reintenta, y nunca una cuenta vacía (FR-033).
- Falla al cargar la lista de movimientos: se muestra un mensaje de error, nunca una lista vacía
  engañosa ni un saldo incorrecto.
- Mensajes: cada mensaje de éxito o de error queda visible hasta que el usuario presiona
  "Aceptar" (no desaparece solo, ni a los 10 segundos). (AC-113)
- Pantallas angostas: en 320px se pueden hacer todas las acciones de la sección Cuenta sin
  desplazamiento horizontal.

## Requirements *(mandatory)*

Las referencias entre paréntesis remiten a `PRD.md` e `INTERFAZ.md`, que son la fuente de verdad
para los textos exactos.

### Functional Requirements

Los números de FR son identificadores fijos, no posiciones. Los FR-032 a FR-036 se agregaron durante
la aclaración y la revisión, y están ubicados en la sección temática que les corresponde.

**Cuenta y saldo**

- **FR-001**: El sistema DEBE crear, para cada usuario que se registra, una única cuenta "Mi
  Cuenta" en USD con saldo 0 y las categorías por defecto "Pago Realizado" (gasto) y "Pago
  Ingresado" (ingreso). (RF-04, RF-05)
- **FR-002**: La sección Cuenta DEBE ser la pantalla inicial luego de autenticarse y mostrar, sin
  ninguna interacción, el encabezado "<nombre> (<código ISO>)" y el saldo "<código ISO>
  <monto>". Mientras se cargan el saldo y la lista, se muestra "Cargando…" en su lugar. (RF-25,
  UI-01, UI-02)
- **FR-003**: El saldo DEBE mostrarse en verde si es mayor a 0, en rojo si es menor a 0 y en el
  color normal si es 0. (UI-03)
- **FR-004**: El saldo DEBE ser en todo momento igual a la suma de los ingresos menos la suma de
  los gastos de la cuenta, incluso con operaciones simultáneas del mismo usuario desde varias
  pestañas o dispositivos, y PUEDE ser negativo. El saldo solo cambia a través de movimientos.
  (RF-45, RF-46, RF-47, RNF-05)

**Alta de movimientos**

- **FR-005**: El usuario DEBE poder añadir un gasto con "Añadir Gasto" y un ingreso con "Añadir
  Ingreso", indicando monto, categoría y fecha, los tres obligatorios. (RF-29, RF-30)
- **FR-006**: El formulario de alta DEBE abrirse siempre con el monto vacío, la fecha de hoy y la
  categoría por defecto del tipo ("Pago Realizado" o "Pago Ingresado"), sin conservar valores de
  un intento anterior. (RF-31, RF-34, RF-35, RF-36)
- **FR-007**: El selector de categoría DEBE tener siempre una categoría seleccionada, mostrar solo
  las del tipo del movimiento y ordenarlas con la por defecto primero y las demás en orden
  alfabético, sin distinguir mayúsculas, minúsculas ni tildes. (RF-32, RF-39, RF-40, RF-71)
- **FR-008**: La fecha DEBE elegirse con un calendario de solo fecha (sin hora), que siempre tenga
  una fecha seleccionada y deshabilite los días posteriores a hoy. El calendario está en español
  y la semana empieza el lunes. No hay fecha mínima. (RF-33, RF-37, RF-38)
- **FR-009**: El campo de monto DEBE aceptar solo dígitos y una coma decimal, con hasta dos
  decimales, y agregar automáticamente el punto de miles mientras se escribe. El texto pegado
  pasa por el mismo filtro. Se quitan los ceros a la izquierda, una coma inicial se completa como
  "0," y una parte decimal incompleta se guarda con dos decimales ("1500," → 1.500,00; "0,5" →
  0,50). (RF-43, RF-44, UI-04)
- **FR-010**: Al presionar "Guardar", el sistema DEBE rechazar un monto vacío o no mayor a 0 con "El monto debe ser mayor
  a 0." y un monto mayor a 999.999.999.999,99 con "El monto máximo es 999.999.999.999,99.".
  (RF-41, RF-42)

**Lista de movimientos**

- **FR-011**: La lista DEBE ordenarse por fecha del movimiento (más reciente primero) y, dentro de
  una misma fecha, por momento del alta (más reciente primero); editar no cambia el momento del
  alta. (RF-48)
- **FR-012**: La lista DEBE agruparse por fecha con encabezados "DD/MM/AAAA" y mostrar en cada
  fila la categoría a la izquierda y el monto a la derecha, sin el tipo ni el código de moneda,
  con "-" y en rojo para los gastos y "+" y en verde para los ingresos. Un nombre largo pasa a
  otra línea; el monto siempre se ve completo. (UI-05..UI-09)
- **FR-013**: Sin movimientos, DEBE mostrarse "Aquí verá sus movimientos." en lugar de la lista.
  (RF-49)
- **FR-014**: La lista DEBE paginarse de a 50, con "Anterior" y "Siguiente" (deshabilitados en la
  primera y la última página) y el indicador "Página X de Y" debajo, todo eso visible solo con
  más de 50 movimientos. Mientras se carga una página, los botones quedan deshabilitados; si la
  página actual queda vacía, se muestra la última página con movimientos. (RF-50..RF-54)
- **FR-015**: Tras guardar con éxito un alta, una edición o una eliminación, la lista DEBE mostrar
  la página 1; si la operación falla, se queda en la página actual. (RF-55)

**Edición y eliminación**

- **FR-016**: Al presionar la fila de un movimiento (toque o clic) DEBE mostrarse un menú con
  "Editar" y "Eliminar"; eliminar solo se ofrece desde ese menú. El menú se cierra sin elegir
  nada tocando fuera de él. (RF-56, RF-57, RF-65)
- **FR-017**: El formulario de edición DEBE mostrar los valores guardados (monto sin signo,
  categoría, fecha preseleccionada en el calendario y un selector de tipo "Gasto"/"Ingreso" con el
  tipo actual) y permitir cambiar monto, categoría, fecha y tipo, con las mismas reglas que el
  alta. (RF-58, RF-60, RF-62, RF-90, UI-11)
- **FR-018**: Al cambiar el tipo, el movimiento DEBE conservar su monto y tomar la categoría por
  defecto del nuevo tipo, salvo que el usuario elija otra categoría de ese tipo. (RF-59, RF-61)
- **FR-019**: Eliminar un movimiento DEBE pedir confirmación con "¿Está seguro que desea eliminar
  este movimiento?", "Confirmar" y "Cancelar". (RF-66, RF-67)
- **FR-020**: Toda alta, edición (incluido el cambio de tipo) o eliminación DEBE actualizar el
  movimiento y el saldo como una sola operación indivisible: ante cualquier falla, nada cambia, el
  formulario queda abierto con los valores ingresados para reintentar y se muestra el mensaje de
  error. (RF-63, RF-68, RNF-05)
- **FR-021**: Los formularios de alta y edición DEBEN mostrar "Guardar" y permitir cerrarse sin
  guardar con "Cancelar" o con la flecha para volver atrás, descartando los cambios. (RF-03,
  RF-64, RF-90, RF-91; AC-98 parcial: los formularios de movimientos)
- **FR-032**: Mientras se procesa un alta, una edición o una eliminación, el botón que la
  disparó DEBE quedar deshabilitado con el texto "Guardando…" (o "Eliminando…" en la
  confirmación de eliminar), y el formulario o la confirmación no DEBEN poder editarse ni
  cerrarse ("Cancelar" y la flecha para volver atrás quedan deshabilitados) hasta que la
  operación termine. Cada confirmación DEBE producir como máximo una
  operación.

**Mensajes**

- **FR-022**: Al completar cada operación, DEBE mostrarse "Gasto registrado con éxito.",
  "Ingreso registrado con éxito.", "Movimiento actualizado con éxito." o "Movimiento eliminado con
  éxito.", según corresponda. Al guardar con éxito, primero se cierra el formulario y se
  actualizan la lista y el saldo, y después se muestra el mensaje. (RF-69)
- **FR-023**: Cada mensaje de éxito DEBE mostrarse con un ícono de tic verde y cada mensaje de
  error con un ícono de cruz roja, y quedar visible hasta que el usuario presione "Aceptar".
  Mientras un mensaje está visible no se puede operar el resto de la pantalla, así que nunca hay
  dos mensajes a la vez. (RF-104, UI-14, UI-15)
- **FR-024**: Si falla una operación, DEBE mostrarse un mensaje de error sin detalles técnicos:
  "No se pudo registrar el gasto. Vuelva a intentarlo.", "No se pudo registrar el ingreso. Vuelva
  a intentarlo.", "No se pudo actualizar el movimiento. Vuelva a intentarlo.", "No se pudo
  eliminar el movimiento. Vuelva a intentarlo.", "No se pudieron cargar los movimientos. Vuelva a
  intentarlo." o "No se pudieron cargar las categorías. Vuelva a intentarlo.", según corresponda.
  Si la edición o la eliminación fallan porque el movimiento ya no existe (fue eliminado desde
  otra pestaña o dispositivo), DEBE mostrarse en cambio "El movimiento ya no existe. La lista se actualizará.", y al
  presionar "Aceptar" se recargan el saldo y la página actual.
  (RNF-07)
- **FR-033**: Si al abrir la aplicación no se puede iniciar la sesión, DEBE mostrarse solo el
  mensaje "No se pudo iniciar sesión. Vuelva a intentarlo." con una cruz roja y el botón
  "Aceptar", que reintenta iniciar la sesión, sin mostrar la sección Cuenta hasta que la sesión se
  inicie. (RF-104, RNF-07) Este requisito es temporal: en la feature 005 se reemplaza por el
  flujo de RF-24, donde "Aceptar" solo cierra el mensaje y el usuario reintenta con "Iniciar
  Sesión con Google".

**Seguridad e integridad**

- **FR-025**: El sistema DEBE rechazar, incluso para solicitudes que no pasan por la interfaz,
  todo intento de leer, crear, editar o eliminar cuentas, categorías o movimientos de otro
  usuario, y todo intento de usar en un movimiento una categoría de otro usuario. (RNF-03)
- **FR-026**: El sistema DEBE aplicar en el servidor, además de en la interfaz, tanto en el alta
  como en la edición, las validaciones
  de monto (mayor a 0, máximo 999.999.999.999,99, hasta dos decimales), de categoría (del mismo
  tipo que el movimiento y de la misma cuenta) y de fecha (no posterior a la fecha de mañana
  según la hora universal, UTC). (RF-38, RF-39, RF-41..RF-43)
- **FR-027**: Los montos y el saldo DEBEN representarse en formato decimal exacto con dos
  decimales, sin errores de redondeo, y el saldo no DEBE tener tope de dígitos enteros.
  (RNF-04)
- **FR-028**: El sistema DEBE impedir, incluso en solicitudes que no pasan por la interfaz,
  editar o eliminar las categorías por defecto. (RF-87, RF-88)
- **FR-034**: El sistema DEBE impedir, incluso en solicitudes que no pasan por la interfaz, que un
  usuario cree o elimine cuentas o modifique el saldo directamente. (RNF-03, RNF-05)
- **FR-035**: El sistema NO DEBE registrar montos, saldos, categorías ni otros datos financieros
  de los usuarios en registros técnicos ni en la consola. (Constitución, principio III)

**Presentación**

- **FR-029**: Todos los montos y saldos DEBEN mostrarse con dos decimales en formato argentino
  (ej. "1.000,50"). (UI-10)
- **FR-030**: La sección Cuenta y los formularios DEBEN poder usarse sin pérdida de funcionalidad
  ni desplazamiento horizontal entre 320px y 1920px de ancho. (RNF-06)
- **FR-031**: Los textos DEBEN cumplir un contraste de al menos 4,5:1 (3:1 para texto grande) y
  los íconos de éxito y de error de al menos 3:1. (UI-16)
- **FR-036**: Todas las acciones de esta feature DEBEN poder hacerse solo con el teclado, con el
  foco visible en todo momento, y los íconos de éxito y de error DEBEN tener un texto alternativo
  ("Éxito" y "Error") para lectores de pantalla.

### Key Entities

- **Usuario**: persona autenticada. Es dueña de exactamente una cuenta.
- **Cuenta**: pertenece a un usuario. Tiene nombre ("Mi Cuenta"), moneda (código ISO 4217; USD
  en esta feature) y saldo (decimal exacto, puede ser negativo).
- **Categoría**: pertenece a una cuenta. Tiene nombre, tipo (ingreso o gasto) y una marca de si es
  por defecto. Cada cuenta tiene siempre las dos por defecto.
- **Movimiento**: pertenece a una cuenta. Tiene tipo (ingreso o gasto), monto (decimal exacto,
  mayor a 0, hasta 999.999.999.999,99), categoría (del mismo tipo y de la misma cuenta), fecha
  (día calendario, no posterior a hoy; sin fecha mínima) y momento del alta (para ordenar dentro del mismo día).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El saldo se ve en la pantalla inicial luego de iniciar sesión, con 0 interacciones. (O-1)
- **SC-002**: Un gasto con la categoría y la fecha por defecto se registra en 3 interacciones
  desde la sección Cuenta. (O-1)
- **SC-003**: Con una cuenta de 5.000 movimientos y las condiciones de medición del PRD, el 95% de
  las altas, ediciones y eliminaciones muestran la lista y el saldo actualizados en menos de 2
  segundos. (RNF-02, AC-115)
- **SC-004**: El 100% de los intentos de acceder o modificar datos de otro usuario se rechaza,
  medido con las pruebas de AC-116, AC-117 y AC-118. (RNF-03)
- **SC-005**: En el 100% de las operaciones con falla simulada, los datos quedan como antes (0
  estados parciales), y después de cada operación el saldo es igual a ingresos menos gastos.
  (RNF-05)
- **SC-006**: Las sumas de montos decimales son exactas al centavo (0,10 + 0,20 = 0,30), incluso
  en el tope de 999.999.999.999,99. (RNF-04)
- **SC-007**: Todas las acciones de la sección Cuenta se pueden completar en 320px, 768px, 1280px
  y 1920px de ancho, sin desplazamiento horizontal. (RNF-06)
- **SC-008**: El 100% de los textos e íconos de la sección Cuenta, sus formularios, menús,
  confirmaciones, mensajes, estados "Cargando…"/"Guardando…"/"Eliminando…" y la pantalla de
  error de sesión cumple el contraste WCAG 2.1 AA. (UI-16)
- **SC-009**: El 100% de las acciones de la sección Cuenta se puede completar solo con el
  teclado, con el foco visible. (FR-036)

## Assumptions

- **Mapa de features**: el PRD se implementa en cinco features, en este orden:
  1. **001 Cuenta y Movimientos** (esta): cuenta y categorías por defecto, saldo, alta, lista,
     edición y eliminación de movimientos.
  2. **002 Navegación y Categorías**: barra de navegación entre las cuatro secciones y flecha
     para volver a Cuenta (RF-01, RF-02, RF-26), y sección Categorías con crear, editar y
     eliminar categorías propias (RF-70..RF-89). Reportes y Perfil muestran "Próximamente."
     hasta que llegue su feature; es andamiaje temporal, no una funcionalidad del producto.
  3. **003 Cuenta y Perfil**: "Editar Cuenta" (nombre y moneda, con la lista ISO 4217), sección
     Perfil y "Restablecer Cuenta" (RF-06..RF-21).
  4. **004 Reportes**: gráficos de torta y barras por categoría y período (RF-92..RF-103, RNF-01,
     UI-12, UI-13).
  5. **005 Google OAuth**: inicio de sesión con Google, error al cancelar o fallar, pantalla
     inicial, cerrar sesión y persistencia de la sesión (RF-22..RF-25, RF-27, RF-28). Reemplaza la
     sesión anónima temporal.
  - RF compartidos entre features: RF-03 y RF-90/RF-91 (formularios: los de movimientos en 001,
    categorías en 002, "Editar Cuenta" en 003); RF-25 (Cuenta como pantalla inicial: 001 con la
    sesión temporal, 005 con Google); RF-87/RF-88 (categorías por defecto: protección en el
    servidor en 001, interfaz en 002).
- **Autenticación temporal**: hasta la feature 005, el ingreso es con una sesión anónima que se
  crea al abrir la aplicación y persiste en el navegador. Cada sesión anónima nueva es un usuario
  nuevo con su propia cuenta. Ese mecanismo queda aislado para reemplazarlo sin tocar la lógica de
  movimientos. Mientras sea temporal se aceptan dos limitaciones: si el usuario borra los datos
  del navegador pierde el acceso a su cuenta, y hay un límite de unas 30 sesiones anónimas nuevas
  por hora por dirección IP (relevante para las pruebas).
- **Datos de rendimiento**: los 5.000 movimientos para medir SC-003 se cargan con un script de
  datos de prueba, no desde la interfaz.
- **Categorías propias**: en esta feature solo existen las dos categorías por defecto; las
  propias se simulan en las pruebas. El ordenamiento del selector (FR-007) se implementa igual, para que
  la feature 002 no tenga que cambiarlo.
- **Moneda**: la cuenta queda en USD; cambiarla es la feature 003. La presentación ya usa el
  código de la moneda de la cuenta, sin asumir USD.
- **Navegación**: en esta feature la sección Cuenta es la única sección, así que no hay barra de
  navegación (llega en la feature 002). La flecha para volver atrás solo aparece en los
  formularios de movimientos.
- **Textos de error**: el PRD no fija el texto de los errores de servidor; FR-024 los define con
  el formato "No se pudo … Vuelva a intentarlo.", que cumple RNF-07.
- **"Hoy"**: se toma de la fecha local del dispositivo del usuario.
- **Conexión**: la aplicación requiere conexión a internet; no hay modo sin conexión (fuera de
  alcance del PRD).
