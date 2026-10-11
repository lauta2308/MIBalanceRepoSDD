import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Dialogo from './Dialogo.jsx';

const ContextoMensajes = createContext(null);

function IconoExito() {
  return (
    <svg className="icono icono-exito" viewBox="0 0 24 24" role="img" aria-label="Éxito">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="m6.5 12.5 3.5 3.5 7.5-8" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoError() {
  return (
    <svg className="icono icono-error" viewBox="0 0 24 24" role="img" aria-label="Error">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="m8 8 8 8M16 8l-8 8" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Un solo mensaje a la vez (FR-023): modal, visible hasta que el usuario presiona "Aceptar".
export function ProveedorMensajes({ children }) {
  const [mensaje, EstablecerMensaje] = useState(null);
  const resolverActual = useRef(null);

  // Devuelve una promesa que se resuelve cuando el usuario presiona "Aceptar".
  const MostrarMensaje = useCallback(({ tipo, texto }) => {
    return new Promise((resolver) => {
      resolverActual.current = resolver;
      EstablecerMensaje({ tipo, texto });
    });
  }, []);

  function ManejarAceptar() {
    const resolver = resolverActual.current;
    resolverActual.current = null;
    EstablecerMensaje(null);
    if (resolver) resolver();
  }

  const valor = useMemo(() => ({ MostrarMensaje }), [MostrarMensaje]);

  return (
    <ContextoMensajes.Provider value={valor}>
      {children}
      <Dialogo abierto={mensaje !== null} etiqueta={mensaje?.tipo === 'exito' ? 'Éxito' : 'Error'}>
        {mensaje && (
          <>
            <div className="mensaje" role="alert">
              {mensaje.tipo === 'exito' ? <IconoExito /> : <IconoError />}
              <p>{mensaje.texto}</p>
            </div>
            <div className="botones">
              <button type="button" className="boton boton-primario" onClick={ManejarAceptar} data-enfoque-inicial>
                Aceptar
              </button>
            </div>
          </>
        )}
      </Dialogo>
    </ContextoMensajes.Provider>
  );
}

// El prefijo "use" lo impone React para los hooks.
export function useMensajes() {
  return useContext(ContextoMensajes);
}

export { IconoError };
