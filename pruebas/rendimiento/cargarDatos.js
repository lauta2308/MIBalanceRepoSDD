import { createClient } from '@supabase/supabase-js';

const TAMANIO_TANDA = 50;

function ACentavos(texto) {
  const negativo = texto.startsWith('-');
  const [entero, decimales = ''] = texto.replace(/^[-+]/, '').split('.');
  const centavos = BigInt(entero || '0') * 100n + BigInt((decimales + '00').slice(0, 2));
  return negativo ? -centavos : centavos;
}

// Movimiento número i: fechas pasadas repartidas en unos 5 años y montos variados.
function DatosMovimiento(indice) {
  const fecha = new Date(Date.UTC(2020, 0, 1) + (indice % 1800) * 24 * 60 * 60 * 1000);
  return {
    tipo: indice % 3 === 0 ? 'GASTO' : 'INGRESO',
    monto: `${(indice % 997) + 1}.${String(indice % 100).padStart(2, '0')}`,
    fecha: fecha.toISOString().slice(0, 10),
  };
}

// Crea un usuario de prueba (es_prueba) y carga `cantidad` movimientos con
// basp_agregar_movimiento, en tandas de 50 llamadas en paralelo (research R13). Al terminar
// verifica que el saldo sea igual a ingresos menos gastos.
export async function CrearUsuarioConMovimientos(cantidad) {
  const url = process.env.VITE_SUPABASE_URL;
  const clave = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local');

  const cliente = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await cliente.auth.signInAnonymously({ options: { data: { es_prueba: true } } });
  if (error) throw new Error(`No se pudo crear el usuario de prueba: ${error.message}`);

  const { data: categorias, error: errorCategorias } = await cliente
    .from('bat_categorias')
    .select('id, tipo, es_por_defecto');
  if (errorCategorias) throw new Error(errorCategorias.message);
  const idPorTipo = {
    GASTO: categorias.find((c) => c.tipo === 'GASTO' && c.es_por_defecto).id,
    INGRESO: categorias.find((c) => c.tipo === 'INGRESO' && c.es_por_defecto).id,
  };

  let esperado = 0n;
  for (let inicio = 0; inicio < cantidad; inicio += TAMANIO_TANDA) {
    const tanda = [];
    for (let indice = inicio; indice < Math.min(inicio + TAMANIO_TANDA, cantidad); indice += 1) {
      const movimiento = DatosMovimiento(indice);
      esperado += movimiento.tipo === 'INGRESO' ? ACentavos(movimiento.monto) : -ACentavos(movimiento.monto);
      tanda.push(
        cliente.rpc('basp_agregar_movimiento', {
          p_tipo: movimiento.tipo,
          p_monto: movimiento.monto,
          p_id_categoria: idPorTipo[movimiento.tipo],
          p_fecha: movimiento.fecha,
        }),
      );
    }
    for (const { error: errorAlta } of await Promise.all(tanda)) {
      if (errorAlta) throw new Error(`No se pudo cargar un movimiento: ${errorAlta.message}`);
    }
  }

  const { data: cuenta, error: errorCuenta } = await cliente.rpc('basp_obtener_cuenta').single();
  if (errorCuenta) throw new Error(errorCuenta.message);
  if (ACentavos(cuenta.saldo) !== esperado) {
    throw new Error(`El saldo ${cuenta.saldo} no es igual a ingresos menos gastos`);
  }
  const { count } = await cliente.from('bav_movimientos').select('id', { count: 'exact', head: true });
  if (count !== cantidad) throw new Error(`Se esperaban ${cantidad} movimientos y hay ${count}`);

  return { cliente, sesion: data.session };
}
