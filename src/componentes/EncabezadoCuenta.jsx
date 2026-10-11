import { FormatearMonto, ObtenerSignoMonto } from '../utilidades/montos.js';

const CLASES_POR_SIGNO = { 1: 'monto-positivo', '-1': 'monto-negativo', 0: '' };

// "<nombre> (<código>)" y el saldo "<código> <monto>" en verde, rojo o color normal (FR-002, FR-003).
export default function EncabezadoCuenta({ cuenta }) {
  const claseColor = CLASES_POR_SIGNO[ObtenerSignoMonto(cuenta.saldo)];
  return (
    <header className="encabezado-cuenta">
      <h1>
        {cuenta.nombre} ({cuenta.codigo_moneda})
      </h1>
      <p className={`saldo monto ${claseColor}`.trim()}>
        {cuenta.codigo_moneda} {FormatearMonto(cuenta.saldo)}
      </p>
    </header>
  );
}
