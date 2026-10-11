import { IconoError } from './Mensaje.jsx';

// FR-033 (temporal hasta la feature 005): solo el mensaje y "Aceptar", que reintenta.
export default function PantallaErrorSesion({ alReintentar }) {
  return (
    <main className="contenedor">
      <div className="pantalla-error-sesion">
        <div className="mensaje" role="alert">
          <IconoError />
          <p>No se pudo iniciar sesión. Vuelva a intentarlo.</p>
        </div>
        <div className="botones">
          <button type="button" className="boton boton-primario" onClick={alReintentar} autoFocus>
            Aceptar
          </button>
        </div>
      </div>
    </main>
  );
}
