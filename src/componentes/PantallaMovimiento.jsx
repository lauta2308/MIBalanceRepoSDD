import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ObtenerCategorias } from '../servicios/categorias.js';
import { EsMovimientoInexistente, TEXTO_MOVIMIENTO_INEXISTENTE, TraducirError } from '../servicios/errores.js';
import { AgregarMovimiento, EditarMovimiento, ObtenerMovimiento } from '../servicios/movimientos.js';
import FormularioMovimiento from './FormularioMovimiento.jsx';
import { useMensajes } from './Mensaje.jsx';

const TEXTOS_EXITO_ALTA = {
  GASTO: 'Gasto registrado con éxito.',
  INGRESO: 'Ingreso registrado con éxito.',
};

const MENSAJE_INEXISTENTE = { tipo: 'error', texto: TEXTO_MOVIMIENTO_INEXISTENTE, recargar: true };

// Página de la lista desde la que se abrió el formulario, para volver a ella (FR-021).
function ObtenerRutaDeVuelta(parametros) {
  const pagina = parametros.get('pagina');
  return pagina ? `/?pagina=${encodeURIComponent(pagina)}` : '/';
}

// Rutas de alta y de edición: cargan los datos cada vez y arman el formulario con valores
// nuevos (alta, FR-006) o guardados (edición, FR-017).
export default function PantallaMovimiento({ modo, tipo }) {
  const esEdicion = modo === 'edicion';
  const navegar = useNavigate();
  const { idMovimiento } = useParams();
  const [parametros] = useSearchParams();
  const { MostrarMensaje } = useMensajes();
  const [datos, EstablecerDatos] = useState(null);
  const rutaDeVuelta = ObtenerRutaDeVuelta(parametros);

  useEffect(() => {
    let vigente = true;

    async function CargarDatos() {
      let categorias;
      let movimiento;
      try {
        [categorias, movimiento] = await Promise.all([
          ObtenerCategorias(),
          esEdicion ? ObtenerMovimiento(idMovimiento) : Promise.resolve(null),
        ]);
      } catch (error) {
        if (!vigente) return;
        // Falla de carga: el mensaje y, al presionar "Aceptar", vuelta a la lista (FR-024).
        const operacion = esEdicion ? 'CARGAR_MOVIMIENTOS' : 'CARGAR_CATEGORIAS';
        await MostrarMensaje({ tipo: 'error', texto: TraducirError(error, operacion) });
        navegar(rutaDeVuelta);
        return;
      }
      if (!vigente) return;
      if (esEdicion && !movimiento) {
        // El movimiento ya no existe: vuelve a la lista, que se recarga, y avisa (FR-024).
        navegar(rutaDeVuelta, { state: { mensaje: MENSAJE_INEXISTENTE } });
        return;
      }
      EstablecerDatos({ categorias, movimiento });
    }

    CargarDatos();
    return () => {
      vigente = false;
    };
  }, [esEdicion, idMovimiento, MostrarMensaje, navegar, rutaDeVuelta]);

  function Volver() {
    navegar(rutaDeVuelta);
  }

  async function GuardarAlta(valores) {
    try {
      await AgregarMovimiento(valores);
    } catch (error) {
      return { ok: false, texto: TraducirError(error, tipo === 'GASTO' ? 'AGREGAR_GASTO' : 'AGREGAR_INGRESO') };
    }
    // Primero se cierra el formulario y se actualiza la lista; después, el mensaje (FR-022).
    navegar('/', { state: { mensaje: { tipo: 'exito', texto: TEXTOS_EXITO_ALTA[tipo] } } });
    return { ok: true };
  }

  async function GuardarEdicion(valores) {
    try {
      await EditarMovimiento({ idMovimiento, ...valores });
    } catch (error) {
      if (EsMovimientoInexistente(error)) {
        navegar(rutaDeVuelta, { state: { mensaje: MENSAJE_INEXISTENTE } });
        return { ok: true };
      }
      return { ok: false, texto: TraducirError(error, 'EDITAR') };
    }
    navegar('/', { state: { mensaje: { tipo: 'exito', texto: 'Movimiento actualizado con éxito.' } } });
    return { ok: true };
  }

  if (!datos) {
    return (
      <main className="contenedor">
        <p className="texto-cargando">Cargando…</p>
      </main>
    );
  }

  return (
    <FormularioMovimiento
      key={esEdicion ? idMovimiento : `alta-${tipo}`}
      modo={modo}
      tipoInicial={tipo}
      movimiento={datos.movimiento}
      categorias={datos.categorias}
      alGuardar={esEdicion ? GuardarEdicion : GuardarAlta}
      alCancelar={Volver}
    />
  );
}
