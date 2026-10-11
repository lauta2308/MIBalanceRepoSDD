import { TAMANIO_PAGINA } from '../servicios/movimientos.js';

// "Anterior", "Siguiente" y "Página X de Y" debajo de la lista, solo con más de 50
// movimientos (FR-014).
export default function Paginacion({ paginaActual, totalMovimientos, cargando = false, alCambiarPagina }) {
  if (totalMovimientos <= TAMANIO_PAGINA) return null;
  const totalPaginas = Math.ceil(totalMovimientos / TAMANIO_PAGINA);

  return (
    <nav className="paginacion" aria-label="Paginación">
      <button
        type="button"
        className="boton"
        onClick={() => alCambiarPagina(paginaActual - 1)}
        disabled={cargando || paginaActual <= 1}
      >
        Anterior
      </button>
      <p className="indicador" aria-live="polite">
        Página {paginaActual} de {totalPaginas}
      </p>
      <button
        type="button"
        className="boton"
        onClick={() => alCambiarPagina(paginaActual + 1)}
        disabled={cargando || paginaActual >= totalPaginas}
      >
        Siguiente
      </button>
    </nav>
  );
}
