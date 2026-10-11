import { useRef, useState } from 'react';
import { FiltrarCategoriasPorTipo, OrdenarCategorias } from '../utilidades/categorias.js';
import { ObtenerFechaHoy } from '../utilidades/fechas.js';
import { ConvertirEntradaAMontoApi, ConvertirMontoApiAEntrada, ValidarMonto } from '../utilidades/montos.js';
import BotonVolver from './BotonVolver.jsx';
import CampoMonto from './CampoMonto.jsx';
import { useMensajes } from './Mensaje.jsx';
import SelectorCategoria from './SelectorCategoria.jsx';
import SelectorFecha from './SelectorFecha.jsx';
import SelectorTipo from './SelectorTipo.jsx';

function ObtenerCategoriasDelTipo(categorias, tipo) {
  return OrdenarCategorias(FiltrarCategoriasPorTipo(categorias, tipo));
}

function ObtenerIdCategoriaPorDefecto(categorias, tipo) {
  return categorias.find((categoria) => categoria.tipo === tipo && categoria.es_por_defecto)?.id ?? '';
}

// Formulario de alta y de edición de un movimiento.
// alGuardar({ tipo, monto, idCategoria, fecha }) devuelve una promesa con { ok, texto? }: si
// ok es false y hay texto, el formulario muestra el error y queda abierto con los valores
// (FR-020).
export default function FormularioMovimiento({ modo, tipoInicial, movimiento, categorias, alGuardar, alCancelar }) {
  const esEdicion = modo === 'edicion';
  const { MostrarMensaje } = useMensajes();

  const [tipo, EstablecerTipo] = useState(esEdicion ? movimiento.tipo : tipoInicial);
  const [monto, EstablecerMonto] = useState(esEdicion ? ConvertirMontoApiAEntrada(movimiento.monto) : '');
  const [idCategoria, EstablecerIdCategoria] = useState(
    esEdicion ? movimiento.id_categoria : ObtenerIdCategoriaPorDefecto(categorias, tipoInicial),
  );
  const [fecha, EstablecerFecha] = useState(esEdicion ? movimiento.fecha : ObtenerFechaHoy());
  const [guardando, EstablecerGuardando] = useState(false);
  const enviando = useRef(false);

  let titulo = 'Editar Movimiento';
  if (!esEdicion) titulo = tipo === 'GASTO' ? 'Añadir Gasto' : 'Añadir Ingreso';

  // Al cambiar el tipo, la categoría pasa a la por defecto del nuevo tipo (FR-018).
  function ManejarCambioTipo(tipoNuevo) {
    EstablecerTipo(tipoNuevo);
    EstablecerIdCategoria(ObtenerIdCategoriaPorDefecto(categorias, tipoNuevo));
  }

  async function ManejarEnvio(evento) {
    evento.preventDefault();
    if (enviando.current) return;

    const montoApi = ConvertirEntradaAMontoApi(monto);
    const errorMonto = ValidarMonto(montoApi);
    if (errorMonto) {
      MostrarMensaje({ tipo: 'error', texto: errorMonto });
      return;
    }

    enviando.current = true;
    EstablecerGuardando(true);
    const resultado = await alGuardar({ tipo, monto: montoApi, idCategoria, fecha });
    enviando.current = false;
    EstablecerGuardando(false);
    if (resultado && !resultado.ok && resultado.texto) {
      MostrarMensaje({ tipo: 'error', texto: resultado.texto });
    }
  }

  return (
    <main className="contenedor pantalla-formulario">
      <header>
        <BotonVolver alVolver={alCancelar} deshabilitado={guardando} />
        <h1>{titulo}</h1>
      </header>
      <form className="formulario" onSubmit={ManejarEnvio} noValidate>
        {esEdicion && <SelectorTipo valor={tipo} alCambiar={ManejarCambioTipo} deshabilitado={guardando} />}
        <CampoMonto valor={monto} alCambiar={EstablecerMonto} deshabilitado={guardando} />
        <SelectorCategoria
          categorias={ObtenerCategoriasDelTipo(categorias, tipo)}
          valor={idCategoria}
          alCambiar={EstablecerIdCategoria}
          deshabilitado={guardando}
        />
        <SelectorFecha valor={fecha} alCambiar={EstablecerFecha} deshabilitado={guardando} />
        <div className="botones">
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="boton" onClick={alCancelar} disabled={guardando}>
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}
