// Siempre con una categoría seleccionada y sin opción vacía (FR-007). Recibe las categorías del
// tipo ya ordenadas.
export default function SelectorCategoria({ categorias, valor, alCambiar, deshabilitado = false }) {
  return (
    <div className="campo">
      <label htmlFor="campo-categoria">Categoría</label>
      <select
        id="campo-categoria"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        disabled={deshabilitado}
      >
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
