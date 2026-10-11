import Dialogo from './Dialogo.jsx';

// Menú de la fila con "Editar" y "Eliminar"; se cierra tocando fuera o con Esc (FR-016).
export default function MenuMovimiento({ abierto, alEditar, alEliminar, alCerrar }) {
  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} etiqueta="Opciones del movimiento">
      <div className="botones botones-menu">
        <button type="button" className="boton" onClick={alEditar} data-enfoque-inicial>
          Editar
        </button>
        <button type="button" className="boton" onClick={alEliminar}>
          Eliminar
        </button>
      </div>
    </Dialogo>
  );
}
