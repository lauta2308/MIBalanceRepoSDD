import { clienteSupabase } from './clienteSupabase.js';

export const TAMANIO_PAGINA = 50;

async function ContarMovimientos() {
  const { count, error } = await clienteSupabase
    .from('bav_movimientos')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

// Página de la lista (1, 2, …) y total de movimientos de la cuenta.
export async function ObtenerPaginaMovimientos(numeroPagina) {
  const desde = (numeroPagina - 1) * TAMANIO_PAGINA;
  const { data, count, error } = await clienteSupabase
    .from('bav_movimientos')
    .select('*', { count: 'exact' })
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .range(desde, desde + TAMANIO_PAGINA - 1);
  // Una página posterior a la última responde "rango no satisfacible": está vacía.
  if (error?.code === 'PGRST103') {
    return { movimientos: [], total: await ContarMovimientos() };
  }
  if (error) throw error;
  return { movimientos: data, total: count };
}

// monto: texto de la API ("1500.50"), para no pasar nunca por float.
export async function AgregarMovimiento({ tipo, monto, idCategoria, fecha }) {
  const { data, error } = await clienteSupabase.rpc('basp_agregar_movimiento', {
    p_tipo: tipo,
    p_monto: monto,
    p_id_categoria: idCategoria,
    p_fecha: fecha,
  });
  if (error) throw error;
  return data;
}

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Un movimiento para el formulario de edición; null si no existe o es de otro usuario (RLS).
export async function ObtenerMovimiento(idMovimiento) {
  if (!FORMATO_UUID.test(idMovimiento)) return null;
  const { data, error } = await clienteSupabase
    .from('bav_movimientos')
    .select('*')
    .eq('id', idMovimiento)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function EditarMovimiento({ idMovimiento, tipo, monto, idCategoria, fecha }) {
  const { error } = await clienteSupabase.rpc('basp_editar_movimiento', {
    p_id_movimiento: idMovimiento,
    p_tipo: tipo,
    p_monto: monto,
    p_id_categoria: idCategoria,
    p_fecha: fecha,
  });
  if (error) throw error;
}

export async function EliminarMovimiento(idMovimiento) {
  const { error } = await clienteSupabase.rpc('basp_eliminar_movimiento', {
    p_id_movimiento: idMovimiento,
  });
  if (error) throw error;
}
