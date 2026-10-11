import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !clave) {
  // Solo ocurre si falta .env.local; el mensaje es para quien desarrolla, no para el usuario.
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local');
}

export const clienteSupabase = createClient(url, clave);
