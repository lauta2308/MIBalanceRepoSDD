import Dialogo from './Dialogo.jsx';

// Confirmación con "Confirmar" y "Cancelar". Mientras procesa, "Confirmar" pasa a
// "Eliminando…" y los dos botones quedan deshabilitados (FR-019, FR-032).
export default function Confirmacion({ abierto, texto, procesando, alConfirmar, alCancelar }) {
  return (
    <Dialogo abierto={abierto} alCerrar={procesando ? undefined : alCancelar} etiqueta="Confirmación">
      <p>{texto}</p>
      <div className="botones">
        <button type="button" className="boton boton-primario" onClick={alConfirmar} disabled={procesando}>
          {procesando ? 'Eliminando…' : 'Confirmar'}
        </button>
        <button type="button" className="boton" onClick={alCancelar} disabled={procesando} autoFocus>
          Cancelar
        </button>
      </div>
    </Dialogo>
  );
}
