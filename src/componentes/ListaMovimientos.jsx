import { FormatearFecha } from '../utilidades/fechas.js';
import FilaMovimiento from './FilaMovimiento.jsx';

// Agrupa los movimientos (ya ordenados) por fecha con encabezados "DD/MM/AAAA" (FR-012).
function AgruparPorFecha(movimientos) {
  const grupos = [];
  for (const movimiento of movimientos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.fecha === movimiento.fecha) {
      ultimo.movimientos.push(movimiento);
    } else {
      grupos.push({ fecha: movimiento.fecha, movimientos: [movimiento] });
    }
  }
  return grupos;
}

export default function ListaMovimientos({ movimientos }) {
  return (
    <div className="lista-movimientos">
      {AgruparPorFecha(movimientos).map((grupo) => {
        const idEncabezado = `grupo-${grupo.fecha}`;
        return (
          <section key={grupo.fecha} className="grupo-fecha" aria-labelledby={idEncabezado}>
            <h2 id={idEncabezado}>{FormatearFecha(grupo.fecha)}</h2>
            <ul>
              {grupo.movimientos.map((movimiento) => (
                <FilaMovimiento key={movimiento.id} movimiento={movimiento} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
