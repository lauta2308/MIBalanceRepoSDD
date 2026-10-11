import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ObtenerCuenta } from '../servicios/cuenta.js';
import { EsMovimientoInexistente, TraducirError } from '../servicios/errores.js';
import { EliminarMovimiento, ObtenerPaginaMovimientos, TAMANIO_PAGINA } from '../servicios/movimientos.js';
import Confirmacion from './Confirmacion.jsx';
import EncabezadoCuenta from './EncabezadoCuenta.jsx';
import ListaMovimientos from './ListaMovimientos.jsx';
import MenuMovimiento from './MenuMovimiento.jsx';
import { useMensajes } from './Mensaje.jsx';
import Paginacion from './Paginacion.jsx';

// "?pagina=N": sin valor o con un valor inválido es la página 1.
function LeerPagina(parametros) {
  const texto = parametros.get('pagina');
  return texto !== null && /^[1-9]\d{0,5}$/.test(texto) ? parseInt(texto, 10) : 1;
}

// Carga la cuenta y la página pedida; si la página está vacía y hay movimientos, la última
// página con movimientos (FR-014).
async function CargarCuentaYPagina(paginaPedida) {
  const [cuenta, primeraRespuesta] = await Promise.all([ObtenerCuenta(), ObtenerPaginaMovimientos(paginaPedida)]);
  let pagina = paginaPedida;
  let respuesta = primeraRespuesta;
  if (respuesta.movimientos.length === 0 && respuesta.total > 0) {
    pagina = Math.ceil(respuesta.total / TAMANIO_PAGINA);
    respuesta = await ObtenerPaginaMovimientos(pagina);
  }
  return { cuenta, pagina, movimientos: respuesta.movimientos, total: respuesta.total };
}

// Sección Cuenta: saldo, botones de alta y lista paginada de movimientos.
export default function SeccionCuenta() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [parametros, EstablecerParametros] = useSearchParams();
  const { MostrarMensaje } = useMensajes();
  const [datos, EstablecerDatos] = useState(null);
  const [cargandoPagina, EstablecerCargandoPagina] = useState(false);
  const [movimientoSeleccionado, EstablecerMovimientoSeleccionado] = useState(null);
  const [confirmandoEliminacion, EstablecerConfirmandoEliminacion] = useState(false);
  const [eliminando, EstablecerEliminando] = useState(false);
  const omitirCarga = useRef(null);

  const paginaPedida = LeerPagina(parametros);
  const textoPaginaPedida = parametros.get('pagina');

  // Si falla, muestra el error sin saldo ni lista y "Aceptar" reintenta (FR-024).
  const Cargar = useCallback(
    async (pagina) => {
      for (;;) {
        try {
          return await CargarCuentaYPagina(pagina);
        } catch (error) {
          EstablecerDatos(null);
          await MostrarMensaje({ tipo: 'error', texto: TraducirError(error, 'CARGAR_MOVIMIENTOS') });
        }
      }
    },
    [MostrarMensaje],
  );

  // Muestra lo cargado. Si se muestra otra página que la pedida, o hay que quitar el mensaje
  // que dejó el formulario, reemplaza la dirección sin agregar una entrada al historial.
  const Mostrar = useCallback(
    (cargado, quitarMensaje = false) => {
      EstablecerDatos(cargado);
      EstablecerCargandoPagina(false);
      const textoEsperado = cargado.pagina === 1 ? null : String(cargado.pagina);
      if (textoPaginaPedida !== textoEsperado || quitarMensaje) {
        omitirCarga.current = true;
        navegar(textoEsperado ? `/?pagina=${textoEsperado}` : '/', { replace: true, state: null });
      }
    },
    [navegar, textoPaginaPedida],
  );

  const Recargar = useCallback(async () => {
    Mostrar(await Cargar(paginaPedida));
  }, [Cargar, Mostrar, paginaPedida]);

  useEffect(() => {
    // El reemplazo de la dirección hecho por Mostrar no vuelve a cargar lo que ya se muestra.
    if (omitirCarga.current) {
      omitirCarga.current = false;
      return undefined;
    }
    let vigente = true;
    const mensaje = ubicacion.state?.mensaje;
    EstablecerCargandoPagina(true);
    Cargar(paginaPedida).then((cargado) => {
      if (!vigente) return;
      Mostrar(cargado, Boolean(mensaje));
      // Mensaje que dejó el formulario al volver, una sola vez (FR-022).
      if (mensaje) {
        MostrarMensaje(mensaje).then(() => {
          if (mensaje.recargar) Recargar();
        });
      }
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ubicacion.key]);

  function CerrarMenu() {
    EstablecerMovimientoSeleccionado(null);
  }

  function IrAEditar() {
    const idMovimiento = movimientoSeleccionado.id;
    EstablecerMovimientoSeleccionado(null);
    navegar(`/movimientos/${idMovimiento}/editar?pagina=${datos.pagina}`);
  }

  function PedirConfirmacion() {
    EstablecerConfirmandoEliminacion(true);
  }

  function CancelarEliminacion() {
    EstablecerConfirmandoEliminacion(false);
    EstablecerMovimientoSeleccionado(null);
  }

  async function ConfirmarEliminacion() {
    if (eliminando) return;
    EstablecerEliminando(true);
    try {
      await EliminarMovimiento(movimientoSeleccionado.id);
    } catch (error) {
      EstablecerEliminando(false);
      if (EsMovimientoInexistente(error)) {
        // Se eliminó desde otra pestaña o dispositivo: se cierra la confirmación y, al presionar
        // "Aceptar", se recargan el saldo y la página actual (FR-024).
        EstablecerConfirmandoEliminacion(false);
        EstablecerMovimientoSeleccionado(null);
        await MostrarMensaje({ tipo: 'error', texto: TraducirError(error, 'ELIMINAR') });
        await Recargar();
        return;
      }
      // Cualquier otra falla: nada cambia y se queda en la página actual (FR-015, FR-020).
      await MostrarMensaje({ tipo: 'error', texto: TraducirError(error, 'ELIMINAR') });
      return;
    }
    // Tras eliminar: lista y saldo de la página 1 y después el mensaje (FR-015, FR-022).
    const cargado = await Cargar(1);
    EstablecerEliminando(false);
    EstablecerConfirmandoEliminacion(false);
    EstablecerMovimientoSeleccionado(null);
    Mostrar(cargado);
    await MostrarMensaje({ tipo: 'exito', texto: 'Movimiento eliminado con éxito.' });
  }

  function CambiarPagina(pagina) {
    EstablecerParametros(pagina === 1 ? {} : { pagina: String(pagina) });
  }

  const paginaMostrada = datos?.pagina ?? paginaPedida;
  const sufijoPagina = `?pagina=${paginaMostrada}`;

  return (
    <main className="contenedor">
      {datos ? <EncabezadoCuenta cuenta={datos.cuenta} /> : <p className="texto-cargando">Cargando…</p>}
      <div className="botones">
        <button
          type="button"
          className="boton boton-primario"
          onClick={() => navegar(`/movimientos/nuevo/gasto${sufijoPagina}`)}
        >
          Añadir Gasto
        </button>
        <button
          type="button"
          className="boton boton-primario"
          onClick={() => navegar(`/movimientos/nuevo/ingreso${sufijoPagina}`)}
        >
          Añadir Ingreso
        </button>
      </div>
      {datos && datos.total === 0 && <p className="texto-vacio">Aquí verá sus movimientos.</p>}
      {datos && datos.total > 0 && (
        <>
          <ListaMovimientos movimientos={datos.movimientos} alSeleccionar={EstablecerMovimientoSeleccionado} />
          <Paginacion
            paginaActual={datos.pagina}
            totalMovimientos={datos.total}
            cargando={cargandoPagina}
            alCambiarPagina={CambiarPagina}
          />
        </>
      )}
      <MenuMovimiento
        abierto={movimientoSeleccionado !== null && !confirmandoEliminacion}
        alEditar={IrAEditar}
        alEliminar={PedirConfirmacion}
        alCerrar={CerrarMenu}
      />
      <Confirmacion
        abierto={confirmandoEliminacion}
        texto="¿Está seguro que desea eliminar este movimiento?"
        procesando={eliminando}
        alConfirmar={ConfirmarEliminacion}
        alCancelar={CancelarEliminacion}
      />
    </main>
  );
}
