import { useLayoutEffect, useRef } from 'react';
import Dialogo from './Dialogo.jsx';

// Confirmación con "Confirmar" y "Cancelar". Mientras procesa, "Confirmar" pasa a
// "Eliminando…" y los dos botones quedan deshabilitados (FR-019, FR-032).
export default function Confirmacion({ abierto, texto, procesando, alConfirmar, alCancelar }) {
  const botonCancelar = useRef(null);
  const procesabaAntes = useRef(false);

  // Si la operación falla, los botones se habilitan y el foco vuelve a "Cancelar" (FR-036).
  useLayoutEffect(() => {
    if (procesabaAntes.current && !procesando && abierto) botonCancelar.current?.focus();
    procesabaAntes.current = procesando;
  }, [procesando, abierto]);

  return (
    <Dialogo abierto={abierto} alCerrar={procesando ? undefined : alCancelar} etiqueta="Confirmación">
      <p>{texto}</p>
      <div className="botones">
        <button type="button" className="boton boton-primario" onClick={alConfirmar} disabled={procesando}>
          {procesando ? 'Eliminando…' : 'Confirmar'}
        </button>
        <button
          ref={botonCancelar}
          type="button"
          className="boton"
          onClick={alCancelar}
          disabled={procesando}
          data-enfoque-inicial
        >
          Cancelar
        </button>
      </div>
    </Dialogo>
  );
}
