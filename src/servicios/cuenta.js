import { clienteSupabase } from './clienteSupabase.js';

// Cuenta del usuario con el saldo como texto ("-1500.00").
export async function ObtenerCuenta() {
  const { data, error } = await clienteSupabase.rpc('basp_obtener_cuenta').single();
  if (error) throw error;
  return data;
}
