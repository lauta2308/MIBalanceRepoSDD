import { test as base, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const clave = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Clave con la que supabase-js guarda la sesión en el navegador.
const claveAlmacenamiento = url ? `sb-${new URL(url).hostname.split('.')[0]}-auth-token` : '';

function CrearCliente() {
  if (!url || !clave) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local');
  }
  return createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Fecha "AAAA-MM-DD" local del dispositivo desplazada en días (0 = hoy).
export function ObtenerFechaLocal(desplazamientoDias = 0) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + desplazamientoDias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// "AAAA-MM-DD" → "DD/MM/AAAA"
export function FormatearFechaTexto(fecha) {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export const test = base.extend({
  // Un usuario anónimo de prueba por worker (research R10), marcado con es_prueba.
  usuarioPrueba: [
    async ({}, usar) => {
      const cliente = CrearCliente();
      const { data, error } = await cliente.auth.signInAnonymously({
        options: { data: { es_prueba: true } },
      });
      if (error) throw new Error(`No se pudo crear el usuario de prueba: ${error.message}`);
      const { data: categorias, error: errorCategorias } = await cliente
        .from('bat_categorias')
        .select('id, nombre, tipo, es_por_defecto');
      if (errorCategorias) throw new Error(errorCategorias.message);
      await usar({
        cliente,
        sesion: data.session,
        categoriaGasto: categorias.find((c) => c.tipo === 'GASTO' && c.es_por_defecto),
        categoriaIngreso: categorias.find((c) => c.tipo === 'INGRESO' && c.es_por_defecto),
      });
    },
    { scope: 'worker' },
  ],

  // Página con la sesión del usuario de prueba ya guardada en el navegador.
  page: async ({ page, usuarioPrueba }, usar) => {
    await InyectarSesion(page, usuarioPrueba.sesion);
    await usar(page);
    await EliminarMovimientos(usuarioPrueba);
  },

  // Carga movimientos con la sesión del usuario de prueba.
  cargarMovimientos: async ({ usuarioPrueba }, usar) => {
    await usar((movimientos) => CargarMovimientos(usuarioPrueba, movimientos));
  },
});

export { expect };

// Guarda la sesión en el navegador antes de que cargue la aplicación.
export async function InyectarSesion(page, sesion) {
  await page.addInitScript(
    ({ claveSesion, sesionGuardada }) => {
      if (!window.localStorage.getItem(claveSesion)) {
        window.localStorage.setItem(claveSesion, JSON.stringify(sesionGuardada));
      }
    },
    { claveSesion: claveAlmacenamiento, sesionGuardada: sesion },
  );
}

// movimientos: [{ tipo, monto: "1500.00", fecha?: "AAAA-MM-DD" }] en orden de alta.
export async function CargarMovimientos(usuarioPrueba, movimientos) {
  const ids = [];
  for (const movimiento of movimientos) {
    const { data, error } = await usuarioPrueba.cliente.rpc('basp_agregar_movimiento', {
      p_tipo: movimiento.tipo,
      p_monto: movimiento.monto,
      p_id_categoria:
        movimiento.tipo === 'GASTO' ? usuarioPrueba.categoriaGasto.id : usuarioPrueba.categoriaIngreso.id,
      p_fecha: movimiento.fecha ?? ObtenerFechaLocal(0),
    });
    if (error) throw new Error(`No se pudo cargar el movimiento: ${error.message}`);
    ids.push(data);
  }
  return ids;
}

export async function EliminarMovimientoPorApi(usuarioPrueba, idMovimiento) {
  const { error } = await usuarioPrueba.cliente.rpc('basp_eliminar_movimiento', {
    p_id_movimiento: idMovimiento,
  });
  if (error) throw new Error(`No se pudo eliminar el movimiento: ${error.message}`);
}

// Limpieza al final de cada prueba. Antes de existir basp_eliminar_movimiento (migración 0004)
// no hay forma de borrar, y la limpieza se omite.
async function EliminarMovimientos(usuarioPrueba) {
  const { data, error } = await usuarioPrueba.cliente.from('bav_movimientos').select('id');
  if (error) throw new Error(`No se pudieron leer los movimientos: ${error.message}`);
  for (const { id } of data) {
    const { error: errorEliminar } = await usuarioPrueba.cliente.rpc('basp_eliminar_movimiento', {
      p_id_movimiento: id,
    });
    if (errorEliminar?.code === 'PGRST202') return;
    if (errorEliminar) throw new Error(`No se pudo eliminar el movimiento: ${errorEliminar.message}`);
  }
}

// Agrega a la lectura real de bat_categorias categorías propias simuladas (no existen en el
// servidor: sirven para mostrar el selector, no para guardar movimientos).
export async function SimularCategorias(page, categorias) {
  await page.route('**/rest/v1/bat_categorias*', async (ruta) => {
    const respuesta = await ruta.fetch();
    const reales = await respuesta.json();
    const simuladas = categorias.map((categoria, indice) => ({
      id: `00000000-0000-4000-8000-${String(indice + 1).padStart(12, '0')}`,
      nombre: categoria.nombre,
      tipo: categoria.tipo,
      es_por_defecto: false,
    }));
    await ruta.fulfill({ response: respuesta, json: [...reales, ...simuladas] });
  });
}

export async function EsperarSinDesplazamientoHorizontal(page) {
  const { anchoContenido, anchoVisible } = await page.evaluate(() => ({
    anchoContenido: document.documentElement.scrollWidth,
    anchoVisible: document.documentElement.clientWidth,
  }));
  expect(anchoContenido).toBeLessThanOrEqual(anchoVisible);
}

// Respuesta 500 genérica para simular fallas del servidor (AC-127).
export async function ResponderError500(ruta) {
  await ruta.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'error interno simulado' }),
  });
}

// --- Saldo por la API, con BigInt de centavos (nunca float) ---

function ACentavos(texto) {
  const valor = String(texto).trim();
  const negativo = valor.startsWith('-');
  const [entero, decimales = ''] = valor.replace(/^[-+]/, '').split('.');
  const centavos = BigInt(entero || '0') * 100n + BigInt((decimales + '00').slice(0, 2));
  return negativo ? -centavos : centavos;
}

function DeCentavos(centavos) {
  const absoluto = centavos < 0n ? -centavos : centavos;
  return `${centavos < 0n ? '-' : ''}${absoluto / 100n}.${String(absoluto % 100n).padStart(2, '0')}`;
}

export async function ObtenerSaldoPorApi(usuarioPrueba) {
  const { data, error } = await usuarioPrueba.cliente.rpc('basp_obtener_cuenta').single();
  if (error) throw new Error(`No se pudo leer la cuenta: ${error.message}`);
  return data.saldo;
}

// Lleva el saldo al valor pedido ("10000.00") con movimientos de fecha antigua, para
// que no aparezca en el grupo de hoy.
export async function EstablecerSaldo(usuarioPrueba, objetivo) {
  const maximo = 99999999999999n;
  let diferencia = ACentavos(objetivo) - ACentavos(await ObtenerSaldoPorApi(usuarioPrueba));
  while (diferencia !== 0n) {
    const absoluto = diferencia > 0n ? diferencia : -diferencia;
    const parte = absoluto > maximo ? maximo : absoluto;
    await CargarMovimientos(usuarioPrueba, [
      { tipo: diferencia > 0n ? 'INGRESO' : 'GASTO', monto: DeCentavos(parte), fecha: '2000-01-01' },
    ]);
    diferencia += diferencia > 0n ? -parte : parte;
  }
}

export async function ContarMovimientosPorApi(usuarioPrueba) {
  const { count, error } = await usuarioPrueba.cliente
    .from('bav_movimientos')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(`No se pudieron contar los movimientos: ${error.message}`);
  return count;
}

export const COLOR_VERDE = 'rgb(27, 110, 52)';
export const COLOR_ROJO = 'rgb(179, 38, 30)';
