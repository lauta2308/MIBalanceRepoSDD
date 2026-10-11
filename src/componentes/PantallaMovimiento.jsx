import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ObtenerCategorias } from '../servicios/categorias.js';
import { TraducirError } from '../servicios/errores.js';
import { AgregarMovimiento } from '../servicios/movimientos.js';
import FormularioMovimiento from './FormularioMovimiento.jsx';
import { useMensajes } from './Mensaje.jsx';

const TEXTOS_EXITO_ALTA = {
  GASTO: 'Gasto registrado con éxito.',
  INGRESO: 'Ingreso registrado con éxito.',
};

// Página de la lista desde la que se abrió el formulario, para volver a ella (FR-021).
function ObtenerRutaDeVuelta(parametros) {
  const pagina = parametros.get('pagina');
  return pagina ? `/?pagina=${encodeURIComponent(pagina)}` : '/';
}

// Ruta de alta: carga las categorías y arma el formulario con valores nuevos cada vez (FR-006).
export default function PantallaMovimiento({ modo, tipo }) {
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const { MostrarMensaje } = useMensajes();
  const [categorias, EstablecerCategorias] = useState(null);
  const rutaDeVuelta = ObtenerRutaDeVuelta(parametros);

  useEffect(() => {
    let vigente = true;
    ObtenerCategorias()
      .then((datos) => {
        if (vigente) EstablecerCategorias(datos);
      })
      .catch(async (error) => {
        if (!vigente) return;
        await MostrarMensaje({ tipo: 'error', texto: TraducirError(error, 'CARGAR_CATEGORIAS') });
        navegar(rutaDeVuelta);
      });
    return () => {
      vigente = false;
    };
  }, [MostrarMensaje, navegar, rutaDeVuelta]);

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

  if (!categorias) {
    return (
      <main className="contenedor">
        <p className="texto-cargando">Cargando…</p>
      </main>
    );
  }

  return (
    <FormularioMovimiento
      key={`${modo}-${tipo}`}
      modo={modo}
      tipoInicial={tipo}
      categorias={categorias}
      alGuardar={GuardarAlta}
      alCancelar={Volver}
    />
  );
}
