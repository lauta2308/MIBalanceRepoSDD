import { FormatearMontoConSigno } from '../utilidades/montos.js';

// Categoría a la izquierda y monto con signo a la derecha, sin tipo ni moneda (FR-012).
export default function FilaMovimiento({ movimiento }) {
  const claseColor = movimiento.tipo === 'GASTO' ? 'monto-negativo' : 'monto-positivo';
  return (
    <li>
      <div className="fila-movimiento">
        <span className="categoria">{movimiento.nombre_categoria}</span>
        <span className={`monto ${claseColor}`}>{FormatearMontoConSigno(movimiento.monto, movimiento.tipo)}</span>
      </div>
    </li>
  );
}
