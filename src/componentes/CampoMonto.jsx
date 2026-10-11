import { FiltrarEntradaMonto } from '../utilidades/montos.js';

// Solo dígitos y una coma, hasta dos decimales, con punto de miles al escribir y al pegar (FR-009).
export default function CampoMonto({ valor, alCambiar, deshabilitado = false }) {
  function ManejarCambio(evento) {
    alCambiar(FiltrarEntradaMonto(evento.target.value));
  }

  return (
    <div className="campo">
      <label htmlFor="campo-monto">Monto</label>
      <input
        id="campo-monto"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={valor}
        onChange={ManejarCambio}
        disabled={deshabilitado}
      />
    </div>
  );
}
