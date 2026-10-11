const comparador = new Intl.Collator('es', { sensitivity: 'base' });

// La categoría por defecto primero; el resto por nombre, sin distinguir mayúsculas ni tildes
// (FR-007, research R8).
export function OrdenarCategorias(categorias) {
  return [...categorias].sort((primera, segunda) => {
    if (primera.es_por_defecto !== segunda.es_por_defecto) return primera.es_por_defecto ? -1 : 1;
    return comparador.compare(primera.nombre, segunda.nombre);
  });
}

export function FiltrarCategoriasPorTipo(categorias, tipo) {
  return categorias.filter((categoria) => categoria.tipo === tipo);
}
