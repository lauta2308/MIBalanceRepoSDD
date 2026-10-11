import { clienteSupabase } from './clienteSupabase.js';

// Categorías de la cuenta del usuario (las filtra el RLS).
export async function ObtenerCategorias() {
  const { data, error } = await clienteSupabase.from('bat_categorias').select('id, nombre, tipo, es_por_defecto');
  if (error) throw error;
  return data;
}
