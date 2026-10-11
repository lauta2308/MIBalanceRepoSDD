import { FormatearMontoConSigno } from '../utilidades/montos.js';

// Categoría a la izquierda y monto con signo a la derecha, sin tipo ni moneda (FR-012). La fila
// es un botón: con clic, toque, Enter o Espacio abre el menú del movimiento (FR-016).
export default function FilaMovimiento({ movimiento, alSeleccionar }) {
  const claseColor = movimiento.tipo === 'GASTO' ? 'monto-negativo' : 'monto-positivo';
  return (
    <li>
      <button type="button" className="fila-movimiento" onClick={() => alSeleccionar(movimiento)}>
        <span className="categoria">{movimiento.nombre_categoria}</span>
        <span className={`monto ${claseColor}`}>{FormatearMontoConSigno(movimiento.monto, movimiento.tipo)}</span>
      </button>
    </li>
  );
}
