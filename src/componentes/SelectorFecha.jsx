import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import {
  ConvertirFechaLocalATexto,
  ConvertirTextoAFechaLocal,
  FormatearFecha,
  ObtenerFechaHoy,
} from '../utilidades/fechas.js';

// Calendario de solo fecha, siempre con una fecha elegida, sin días posteriores a hoy y sin
// fecha mínima; en español y con la semana desde el lunes (FR-008, research R2).
export default function SelectorFecha({ valor, alCambiar, deshabilitado = false }) {
  const [abierto, EstablecerAbierto] = useState(false);
  const hoy = ConvertirTextoAFechaLocal(ObtenerFechaHoy());
  const seleccionada = ConvertirTextoAFechaLocal(valor);
  const abiertoVisible = abierto && !deshabilitado;

  function ManejarSeleccion(fecha) {
    if (!fecha) return;
    alCambiar(ConvertirFechaLocalATexto(fecha));
    EstablecerAbierto(false);
    document.getElementById('boton-fecha')?.focus();
  }

  function ManejarTecla(evento) {
    if (evento.key === 'Escape' && abiertoVisible) {
      evento.stopPropagation();
      EstablecerAbierto(false);
      document.getElementById('boton-fecha')?.focus();
    }
  }

  return (
    <div className="campo" onKeyDown={ManejarTecla}>
      <span className="etiqueta" id="etiqueta-fecha">
        Fecha
      </span>
      <button
        type="button"
        id="boton-fecha"
        className="boton"
        aria-labelledby="etiqueta-fecha boton-fecha"
        aria-expanded={abiertoVisible}
        aria-controls="calendario-fecha"
        onClick={() => EstablecerAbierto(!abierto)}
        disabled={deshabilitado}
      >
        {FormatearFecha(valor)}
      </button>
      {abiertoVisible && (
        <div className="calendario" id="calendario-fecha">
          <DayPicker
            mode="single"
            required
            selected={seleccionada}
            onSelect={ManejarSeleccion}
            defaultMonth={seleccionada}
            endMonth={hoy}
            disabled={{ after: hoy }}
            locale={es}
            weekStartsOn={1}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
