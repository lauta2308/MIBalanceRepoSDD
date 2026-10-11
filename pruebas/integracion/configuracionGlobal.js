import { CrearClienteConToken, CrearUsuarioPrueba, ObtenerCategorias, ObtenerCuenta } from './ayudantes.js';

// Crea exactamente 3 usuarios de prueba por corrida (research R10) y los comparte con los
// archivos de prueba: A y B para aislamiento, y uno para las secuencias de consistencia.
// También guarda cómo quedó la cuenta de A recién creada, antes de que corra cualquier prueba
// (AC-09), porque el orden de los archivos no está garantizado.
export default async function ({ provide }) {
  const a = await CrearUsuarioPrueba();
  const b = await CrearUsuarioPrueba();
  const secuencia = await CrearUsuarioPrueba();

  const clienteA = CrearClienteConToken(a.tokenAcceso);
  const { data: cuentas, error } = await clienteA.from('bat_cuentas').select('id, nombre, codigo_moneda');
  if (error) throw new Error(`No se pudieron leer las cuentas: ${error.message}`);
  const estadoInicialA = {
    cuentas,
    cuenta: await ObtenerCuenta(clienteA),
    categorias: (await ObtenerCategorias(clienteA)).todas,
  };

  provide('usuariosPrueba', { a, b, secuencia });
  provide('estadoInicialA', estadoInicialA);
}
