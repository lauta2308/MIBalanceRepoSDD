import { clienteSupabase } from './clienteSupabase.js';

// ÚNICO lugar que conoce la sesión anónima temporal. La feature 005 lo reemplaza por Google
// OAuth sin tocar el resto de la aplicación.

let promesaEnCurso = null;

async function IniciarSesion() {
  const { data, error } = await clienteSupabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session;

  const { data: datosNuevos, error: errorNuevo } = await clienteSupabase.auth.signInAnonymously();
  if (errorNuevo) throw errorNuevo;
  return datosNuevos.session;
}

// Devuelve la sesión guardada en el navegador o crea una anónima. Si se llama dos veces
// seguidas (por ejemplo, en el modo estricto de React), comparte el mismo intento y no crea
// dos usuarios.
export function ObtenerOIniciarSesion() {
  if (!promesaEnCurso) {
    promesaEnCurso = IniciarSesion().finally(() => {
      promesaEnCurso = null;
    });
  }
  return promesaEnCurso;
}
