// Tipo del movimiento en la edición (FR-017).
export default function SelectorTipo({ valor, alCambiar, deshabilitado = false }) {
  return (
    <div className="campo">
      <label htmlFor="campo-tipo">Tipo</label>
      <select
        id="campo-tipo"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        disabled={deshabilitado}
      >
        <option value="GASTO">Gasto</option>
        <option value="INGRESO">Ingreso</option>
      </select>
    </div>
  );
}
