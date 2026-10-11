import { useLayoutEffect, useRef } from 'react';
import { TAMANIO_PAGINA } from '../servicios/movimientos.js';

// "Anterior", "Siguiente" y "Página X de Y" debajo de la lista, solo con más de 50
// movimientos (FR-014). Mientras carga, los botones quedan deshabilitados con aria-disabled
// para no perder el foco del teclado (FR-036).
export default function Paginacion({ paginaActual, totalMovimientos, cargando = false, alCambiarPagina }) {
  const botonAnterior = useRef(null);
  const botonSiguiente = useRef(null);
  const totalPaginas = Math.ceil(totalMovimientos / TAMANIO_PAGINA);
  const esPrimera = paginaActual <= 1;
  const esUltima = paginaActual >= totalPaginas;

  // Si el botón con foco quedó deshabilitado (primera o última página), el foco pasa al otro.
  // Chrome puede dejar el foco un momento en el botón ya deshabilitado, o pasarlo al body.
  useLayoutEffect(() => {
    const enfocado = document.activeElement;
    const sinFoco = enfocado === document.body;
    if (esUltima && (sinFoco || enfocado === botonSiguiente.current) && botonAnterior.current) {
      botonAnterior.current.focus();
    } else if (esPrimera && (sinFoco || enfocado === botonAnterior.current) && botonSiguiente.current) {
      botonSiguiente.current.focus();
    }
  }, [paginaActual, esPrimera, esUltima]);

  if (totalMovimientos <= TAMANIO_PAGINA) return null;

  function Ir(pagina) {
    if (cargando) return;
    alCambiarPagina(pagina);
  }

  return (
    <nav className="paginacion" aria-label="Paginación">
      <button
        ref={botonAnterior}
        type="button"
        className="boton"
        onClick={() => Ir(paginaActual - 1)}
        disabled={esPrimera}
        aria-disabled={cargando || esPrimera}
      >
        Anterior
      </button>
      <p className="indicador" aria-live="polite">
        Página {paginaActual} de {totalPaginas}
      </p>
      <button
        ref={botonSiguiente}
        type="button"
        className="boton"
        onClick={() => Ir(paginaActual + 1)}
        disabled={esUltima}
        aria-disabled={cargando || esUltima}
      >
        Siguiente
      </button>
    </nav>
  );
}
