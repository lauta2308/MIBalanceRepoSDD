// Fechas como día calendario "AAAA-MM-DD": nunca se convierten a UTC (constitución IV).
// Prohibido toISOString() y new Date("AAAA-MM-DD"), que interpretan la fecha en UTC.

function CompletarConCero(numero) {
  return String(numero).padStart(2, '0');
}

// Date local → "AAAA-MM-DD"
export function ConvertirFechaLocalATexto(fecha) {
  return `${fecha.getFullYear()}-${CompletarConCero(fecha.getMonth() + 1)}-${CompletarConCero(fecha.getDate())}`;
}

// "AAAA-MM-DD" → Date local a las 00:00 (para el calendario).
export function ConvertirTextoAFechaLocal(texto) {
  const [anio, mes, dia] = texto.split('-').map((parte) => parseInt(parte, 10));
  return new Date(anio, mes - 1, dia);
}

// Fecha de hoy según el reloj y la zona horaria del dispositivo.
export function ObtenerFechaHoy() {
  return ConvertirFechaLocalATexto(new Date());
}

// "2026-09-17" → "17/09/2026"
export function FormatearFecha(texto) {
  const [anio, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${anio}`;
}
