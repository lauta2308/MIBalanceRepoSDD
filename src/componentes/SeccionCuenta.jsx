import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ObtenerCuenta } from '../servicios/cuenta.js';
import { TraducirError } from '../servicios/errores.js';
import { ObtenerPaginaMovimientos } from '../servicios/movimientos.js';
import EncabezadoCuenta from './EncabezadoCuenta.jsx';
import ListaMovimientos from './ListaMovimientos.jsx';
import { useMensajes } from './Mensaje.jsx';

// Sección Cuenta: saldo, botones de alta y lista de movimientos.
export default function SeccionCuenta() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { MostrarMensaje } = useMensajes();
  const [datos, EstablecerDatos] = useState(null);
  const mensajeMostrado = useRef(null);

  // Carga la cuenta y la lista. Si falla, muestra el error sin saldo ni lista y "Aceptar"
  // reintenta (FR-024).
  const Cargar = useCallback(async () => {
    for (;;) {
      try {
        const [cuenta, pagina] = await Promise.all([ObtenerCuenta(), ObtenerPaginaMovimientos(1)]);
        EstablecerDatos({ cuenta, movimientos: pagina.movimientos, total: pagina.total });
        return;
      } catch (error) {
        await MostrarMensaje({ tipo: 'error', texto: TraducirError(error, 'CARGAR_MOVIMIENTOS') });
      }
    }
  }, [MostrarMensaje]);

  useEffect(() => {
    let vigente = true;
    const mensaje = ubicacion.state?.mensaje;
    // El estado cambia después de await, no de forma sincrónica dentro del efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Cargar().then(() => {
      // Mensaje que dejó el formulario al guardar, una sola vez por navegación.
      if (!vigente || !mensaje || mensajeMostrado.current === ubicacion.key) return;
      mensajeMostrado.current = ubicacion.key;
      navegar(`${ubicacion.pathname}${ubicacion.search}`, { replace: true, state: null });
      MostrarMensaje(mensaje);
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ubicacion.key]);

  return (
    <main className="contenedor">
      {datos ? <EncabezadoCuenta cuenta={datos.cuenta} /> : <p className="texto-cargando">Cargando…</p>}
      <div className="botones">
        <button type="button" className="boton boton-primario" onClick={() => navegar('/movimientos/nuevo/gasto')}>
          Añadir Gasto
        </button>
        <button type="button" className="boton boton-primario" onClick={() => navegar('/movimientos/nuevo/ingreso')}>
          Añadir Ingreso
        </button>
      </div>
      {datos && datos.total === 0 && <p className="texto-vacio">Aquí verá sus movimientos.</p>}
      {datos && datos.total > 0 && <ListaMovimientos movimientos={datos.movimientos} />}
    </main>
  );
}
