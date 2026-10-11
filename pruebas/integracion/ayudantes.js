import { createClient } from '@supabase/supabase-js';

const opcionesAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

function ObtenerVariables() {
  const url = process.env.VITE_SUPABASE_URL;
  const clave = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local');
  }
  return { url, clave };
}

// Cliente sin sesión (rol anon) y sin guardar nada en disco.
export function CrearClientePrueba() {
  const { url, clave } = ObtenerVariables();
  return createClient(url, clave, { auth: opcionesAuth });
}

// Cliente autenticado con el token de un usuario ya creado (no inicia otra sesión).
export function CrearClienteConToken(tokenAcceso) {
  const { url, clave } = ObtenerVariables();
  return createClient(url, clave, {
    auth: opcionesAuth,
    global: { headers: { Authorization: `Bearer ${tokenAcceso}` } },
  });
}

// Crea un usuario anónimo marcado como de prueba (lo borra limpiar_usuarios_prueba.sql).
export async function CrearUsuarioPrueba() {
  const cliente = CrearClientePrueba();
  const { data, error } = await cliente.auth.signInAnonymously({
    options: { data: { es_prueba: true } },
  });
  if (error) {
    throw new Error(`No se pudo crear el usuario de prueba: ${error.message}`);
  }
  return {
    idUsuario: data.user.id,
    tokenAcceso: data.session.access_token,
  };
}

// Usuario compartido de la corrida ('a', 'b' o 'secuencia'), creado en configuracionGlobal.js.
export async function ObtenerUsuarioCompartido(nombre) {
  // Import dinámico: este archivo también lo usa el globalSetup, que corre fuera de Vitest.
  const { inject } = await import('vitest');
  const usuario = inject('usuariosPrueba')[nombre];
  const cliente = CrearClienteConToken(usuario.tokenAcceso);
  const cuenta = await ObtenerCuenta(cliente);
  const categorias = await ObtenerCategorias(cliente);
  return { ...usuario, cliente, cuenta, categorias };
}

export async function ObtenerCuenta(cliente) {
  const { data, error } = await cliente.rpc('basp_obtener_cuenta').single();
  if (error) throw new Error(`No se pudo leer la cuenta: ${error.message}`);
  return data;
}

export async function ObtenerCategorias(cliente) {
  const { data, error } = await cliente.from('bat_categorias').select('id, nombre, tipo, es_por_defecto');
  if (error) throw new Error(`No se pudieron leer las categorías: ${error.message}`);
  return {
    todas: data,
    gasto: data.find((categoria) => categoria.tipo === 'GASTO' && categoria.es_por_defecto),
    ingreso: data.find((categoria) => categoria.tipo === 'INGRESO' && categoria.es_por_defecto),
  };
}

export async function ObtenerSaldo(cliente) {
  const cuenta = await ObtenerCuenta(cliente);
  return NormalizarMonto(cuenta.saldo);
}

// --- Aritmética exacta de montos con BigInt de centavos (nunca float) ---

export function ACentavos(texto) {
  const valor = String(texto).trim();
  const negativo = valor.startsWith('-');
  const [entero, decimales = ''] = valor.replace(/^[-+]/, '').split('.');
  if (decimales.length > 2) throw new Error(`Monto con más de dos decimales: ${valor}`);
  const centavos = BigInt(entero || '0') * 100n + BigInt((decimales + '00').slice(0, 2));
  return negativo ? -centavos : centavos;
}

export function DeCentavos(centavos) {
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const entero = absoluto / 100n;
  const decimales = String(absoluto % 100n).padStart(2, '0');
  return `${negativo ? '-' : ''}${entero}.${decimales}`;
}

export function NormalizarMonto(texto) {
  return DeCentavos(ACentavos(texto));
}

export async function ObtenerTodosLosMovimientos(cliente) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await cliente
      .from('bav_movimientos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .range(desde, desde + 999);
    if (error) throw new Error(`No se pudieron leer los movimientos: ${error.message}`);
    filas.push(...data);
    if (data.length < 1000) return filas;
  }
}

// Suma de ingresos menos gastos calculada desde los movimientos (invariante de FR-004).
export async function CalcularSaldoEsperado(cliente) {
  const movimientos = await ObtenerTodosLosMovimientos(cliente);
  const total = movimientos.reduce(
    (suma, movimiento) =>
      suma + (movimiento.tipo === 'INGRESO' ? ACentavos(movimiento.monto) : -ACentavos(movimiento.monto)),
    0n,
  );
  return DeCentavos(total);
}

// --- Operaciones de apoyo ---

export async function AgregarMovimientoPrueba(cliente, categorias, { tipo, monto, fecha, idCategoria }) {
  const { data, error } = await cliente.rpc('basp_agregar_movimiento', {
    p_tipo: tipo,
    p_monto: monto,
    p_id_categoria: idCategoria ?? (tipo === 'GASTO' ? categorias.gasto.id : categorias.ingreso.id),
    p_fecha: fecha ?? ObtenerFechaUtc(0),
  });
  if (error) throw new Error(`No se pudo agregar el movimiento: ${error.message}`);
  return data;
}

const MONTO_MAXIMO_CENTAVOS = 99999999999999n;

// Lleva el saldo al valor pedido agregando ingresos o gastos por la diferencia (en varios
// movimientos si supera el monto máximo de uno).
export async function EstablecerSaldo(cliente, categorias, objetivo) {
  let diferencia = ACentavos(objetivo) - ACentavos(await ObtenerSaldo(cliente));
  while (diferencia !== 0n) {
    const absoluto = diferencia > 0n ? diferencia : -diferencia;
    const parte = absoluto > MONTO_MAXIMO_CENTAVOS ? MONTO_MAXIMO_CENTAVOS : absoluto;
    await AgregarMovimientoPrueba(cliente, categorias, {
      tipo: diferencia > 0n ? 'INGRESO' : 'GASTO',
      monto: DeCentavos(parte),
    });
    diferencia += diferencia > 0n ? -parte : parte;
  }
}

export async function EliminarMovimientosDe(cliente) {
  const movimientos = await ObtenerTodosLosMovimientos(cliente);
  for (const movimiento of movimientos) {
    const { error } = await cliente.rpc('basp_eliminar_movimiento', { p_id_movimiento: movimiento.id });
    if (error) throw new Error(`No se pudo eliminar el movimiento: ${error.message}`);
  }
}

// Fecha "AAAA-MM-DD" en UTC desplazada en días (0 = hoy en UTC, 1 = mañana en UTC).
export function ObtenerFechaUtc(desplazamientoDias) {
  const fecha = new Date(Date.now() + desplazamientoDias * 24 * 60 * 60 * 1000);
  return fecha.toISOString().slice(0, 10);
}

// Espera el error de una RPC y devuelve su código propio (el mensaje de la excepción).
export async function ObtenerCodigoDeError(promesa) {
  const { error } = await promesa;
  return error?.message ?? null;
}
