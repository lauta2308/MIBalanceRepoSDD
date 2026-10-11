// Montos con cadenas y BigInt de centavos. Nunca Number, parseFloat ni toFixed (research R3).
// Formato de la API: "1500.50" (punto decimal, sin miles). Formato argentino: "1.500,50".

const MONTO_MAXIMO_CENTAVOS = 99999999999999n;

// "1500.5" / "-1000" → BigInt de centavos con signo.
function ACentavos(montoApi) {
  const texto = String(montoApi).trim();
  const negativo = texto.startsWith('-');
  const [entero, decimales = ''] = texto.replace(/^[-+]/, '').split('.');
  const centavos = BigInt(entero || '0') * 100n + BigInt((decimales + '00').slice(0, 2));
  return negativo ? -centavos : centavos;
}

function AgregarPuntosDeMiles(entero) {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function FormatearCentavos(centavos) {
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const entero = AgregarPuntosDeMiles(String(absoluto / 100n));
  const decimales = String(absoluto % 100n).padStart(2, '0');
  return `${negativo ? '-' : ''}${entero},${decimales}`;
}

// "1500.5" → "1.500,50"; "-1000" → "-1.000,00"
export function FormatearMonto(montoApi) {
  return FormatearCentavos(ACentavos(montoApi));
}

// ("1500.00", 'GASTO') → "-1.500,00"; ("1000.00", 'INGRESO') → "+1.000,00"
export function FormatearMontoConSigno(montoApi, tipo) {
  return `${tipo === 'GASTO' ? '-' : '+'}${FormatearMonto(montoApi)}`;
}

// 1 si es positivo, -1 si es negativo y 0 si es cero (para el color del saldo).
export function ObtenerSignoMonto(montoApi) {
  const centavos = ACentavos(montoApi);
  if (centavos > 0n) return 1;
  if (centavos < 0n) return -1;
  return 0;
}

// Filtra lo que el usuario escribe o pega: solo dígitos y una coma, hasta dos decimales, sin
// ceros a la izquierda y con punto de miles. "$1.500,50" → "1.500,50"; ",5" → "0,5".
export function FiltrarEntradaMonto(texto) {
  const limpio = String(texto).replace(/[^\d,]/g, '');
  const posicionComa = limpio.indexOf(',');
  const tieneComa = posicionComa !== -1;
  let entero = tieneComa ? limpio.slice(0, posicionComa) : limpio;
  const decimales = tieneComa ? limpio.slice(posicionComa + 1).replace(/,/g, '').slice(0, 2) : '';

  entero = entero.replace(/^0+(?=\d)/, '');
  if (entero === '' && tieneComa) entero = '0';
  if (entero === '') return '';

  return `${AgregarPuntosDeMiles(entero)}${tieneComa ? `,${decimales}` : ''}`;
}

// "1.500,5" → "1500.50"; "1500," → "1500.00"; "" → null
export function ConvertirEntradaAMontoApi(entrada) {
  const texto = String(entrada).replace(/\./g, '');
  if (texto === '') return null;
  const [entero, decimales = ''] = texto.split(',');
  const centavos = BigInt(entero || '0') * 100n + BigInt((decimales + '00').slice(0, 2));
  const enteroNormalizado = String(centavos / 100n);
  return `${enteroNormalizado}.${String(centavos % 100n).padStart(2, '0')}`;
}

// "1500.00" → "1.500,00" (sin signo, para el formulario de edición).
export function ConvertirMontoApiAEntrada(montoApi) {
  const centavos = ACentavos(montoApi);
  return FormatearCentavos(centavos < 0n ? -centavos : centavos);
}

// Devuelve el mensaje de validación o null si el monto es válido (FR-010).
export function ValidarMonto(montoApi) {
  if (montoApi === null || montoApi === undefined || ACentavos(montoApi) <= 0n) {
    return 'El monto debe ser mayor a 0.';
  }
  if (ACentavos(montoApi) > MONTO_MAXIMO_CENTAVOS) {
    return 'El monto máximo es 999.999.999.999,99.';
  }
  return null;
}
