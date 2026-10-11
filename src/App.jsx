import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ProveedorMensajes } from './componentes/Mensaje.jsx';
import PantallaErrorSesion from './componentes/PantallaErrorSesion.jsx';
import PantallaMovimiento from './componentes/PantallaMovimiento.jsx';
import SeccionCuenta from './componentes/SeccionCuenta.jsx';
import { ObtenerOIniciarSesion } from './servicios/sesion.js';

export default function App() {
  const [estadoSesion, EstablecerEstadoSesion] = useState('cargando');

  const ResolverSesion = useCallback(async () => {
    try {
      await ObtenerOIniciarSesion();
      EstablecerEstadoSesion('lista');
    } catch {
      EstablecerEstadoSesion('error');
    }
  }, []);

  useEffect(() => {
    // El estado cambia después de await, no de forma sincrónica dentro del efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ResolverSesion();
  }, [ResolverSesion]);

  function ManejarReintento() {
    EstablecerEstadoSesion('cargando');
    ResolverSesion();
  }

  let contenido;
  if (estadoSesion === 'cargando') {
    contenido = (
      <main className="contenedor">
        <p className="texto-cargando">Cargando…</p>
      </main>
    );
  } else if (estadoSesion === 'error') {
    contenido = <PantallaErrorSesion alReintentar={ManejarReintento} />;
  } else {
    contenido = (
      <Routes>
        <Route path="/" element={<SeccionCuenta />} />
        <Route path="/movimientos/nuevo/gasto" element={<PantallaMovimiento modo="alta" tipo="GASTO" />} />
        <Route path="/movimientos/nuevo/ingreso" element={<PantallaMovimiento modo="alta" tipo="INGRESO" />} />
        <Route path="/movimientos/:idMovimiento/editar" element={<PantallaMovimiento modo="edicion" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return <ProveedorMensajes>{contenido}</ProveedorMensajes>;
}
