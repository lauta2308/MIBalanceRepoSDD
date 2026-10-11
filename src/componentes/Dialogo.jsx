import { useEffect, useRef } from 'react';

// Diálogo modal sobre <dialog> con showModal(): el resto de la página queda inerte (FR-023),
// el foco entra al abrir y vuelve al elemento anterior al cerrar (FR-036).
// alCerrar: si se pasa, Esc y el clic fuera cierran el diálogo; si no, solo se cierra desde
// sus botones.
export default function Dialogo({ abierto, alCerrar, etiqueta, children }) {
  const referencia = useRef(null);
  const elementoAnterior = useRef(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (abierto && !dialogo.open) {
      elementoAnterior.current = document.activeElement;
      dialogo.showModal();
    } else if (!abierto && dialogo.open) {
      dialogo.close();
    }
  }, [abierto]);

  useEffect(() => {
    const dialogo = referencia.current;
    return () => {
      if (dialogo.open) dialogo.close();
    };
  }, []);

  function ManejarCancelar(evento) {
    evento.preventDefault();
    if (alCerrar) alCerrar();
  }

  function ManejarCierre() {
    // El navegador puede cerrarlo por su cuenta (por ejemplo, con Esc repetido).
    if (abierto) {
      if (alCerrar) {
        alCerrar();
      } else {
        referencia.current.showModal();
        return;
      }
    }
    const anterior = elementoAnterior.current;
    if (anterior && anterior.isConnected && typeof anterior.focus === 'function') {
      anterior.focus();
    }
  }

  function ManejarClic(evento) {
    if (!alCerrar || evento.target !== referencia.current) return;
    const rectangulo = referencia.current.getBoundingClientRect();
    const fuera =
      evento.clientX < rectangulo.left ||
      evento.clientX > rectangulo.right ||
      evento.clientY < rectangulo.top ||
      evento.clientY > rectangulo.bottom;
    if (fuera) alCerrar();
  }

  return (
    <dialog
      ref={referencia}
      aria-label={etiqueta}
      onCancel={ManejarCancelar}
      onClose={ManejarCierre}
      onClick={ManejarClic}
    >
      {abierto && <div className="contenido-dialogo">{children}</div>}
    </dialog>
  );
}
