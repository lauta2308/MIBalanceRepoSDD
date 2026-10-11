// Traduce los errores de la API a los textos de la spec (FR-010, FR-024). Nunca devuelve el
// mensaje técnico (RNF-07).

export const TEXTO_MOVIMIENTO_INEXISTENTE = 'El movimiento ya no existe. La lista se actualizará.';

const TEXTOS_GENERICOS = {
  AGREGAR_GASTO: 'No se pudo registrar el gasto. Vuelva a intentarlo.',
  AGREGAR_INGRESO: 'No se pudo registrar el ingreso. Vuelva a intentarlo.',
  EDITAR: 'No se pudo actualizar el movimiento. Vuelva a intentarlo.',
  ELIMINAR: 'No se pudo eliminar el movimiento. Vuelva a intentarlo.',
  CARGAR_MOVIMIENTOS: 'No se pudieron cargar los movimientos. Vuelva a intentarlo.',
  CARGAR_CATEGORIAS: 'No se pudieron cargar las categorías. Vuelva a intentarlo.',
};

const TEXTOS_POR_CODIGO = {
  MONTO_NO_POSITIVO: 'El monto debe ser mayor a 0.',
  MONTO_MAXIMO: 'El monto máximo es 999.999.999.999,99.',
};

function ObtenerCodigo(error) {
  return typeof error?.message === 'string' ? error.message.trim() : null;
}

export function EsMovimientoInexistente(error) {
  return ObtenerCodigo(error) === 'MOVIMIENTO_INEXISTENTE';
}

// operacion: AGREGAR_GASTO, AGREGAR_INGRESO, EDITAR, ELIMINAR, CARGAR_MOVIMIENTOS o
// CARGAR_CATEGORIAS.
export function TraducirError(error, operacion) {
  const codigo = ObtenerCodigo(error);
  if (codigo === 'MOVIMIENTO_INEXISTENTE' && (operacion === 'EDITAR' || operacion === 'ELIMINAR')) {
    return TEXTO_MOVIMIENTO_INEXISTENTE;
  }
  if (Object.hasOwn(TEXTOS_POR_CODIGO, codigo)) {
    return TEXTOS_POR_CODIGO[codigo];
  }
  return TEXTOS_GENERICOS[operacion];
}
