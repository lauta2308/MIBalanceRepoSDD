import { beforeAll, describe, expect, it } from 'vitest';
import {
  CalcularSaldoEsperado,
  EstablecerSaldo,
  ObtenerFechaUtc,
  ObtenerSaldo,
  ObtenerTodosLosMovimientos,
  ObtenerUsuarioCompartido,
} from './ayudantes.js';

// AC-49 y AC-123 (parte alta): en todos los rechazos el saldo no cambia y no queda movimiento.
describe('basp_agregar_movimiento: rechazos', () => {
  let usuario;
  let usuarioB;

  beforeAll(async () => {
    usuario = await ObtenerUsuarioCompartido('a');
    usuarioB = await ObtenerUsuarioCompartido('b');
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '10000.00');
  });

  async function EsperarRechazo(parametros, codigoEsperado) {
    const cantidadAntes = (await ObtenerTodosLosMovimientos(usuario.cliente)).length;
    const { data, error } = await usuario.cliente.rpc('basp_agregar_movimiento', {
      p_tipo: 'GASTO',
      p_monto: '100.00',
      p_id_categoria: usuario.categorias.gasto.id,
      p_fecha: ObtenerFechaUtc(0),
      ...parametros,
    });
    expect(data).toBeNull();
    expect(error?.message).toBe(codigoEsperado);
    expect(await ObtenerSaldo(usuario.cliente)).toBe('10000.00');
    expect(await ObtenerTodosLosMovimientos(usuario.cliente)).toHaveLength(cantidadAntes);
  }

  it.each([['0'], ['0.00'], ['-50']])('rechaza el monto %s con MONTO_NO_POSITIVO', async (monto) => {
    await EsperarRechazo({ p_monto: monto }, 'MONTO_NO_POSITIVO');
  });

  it('rechaza el monto nulo con MONTO_NO_POSITIVO', async () => {
    await EsperarRechazo({ p_monto: null }, 'MONTO_NO_POSITIVO');
  });

  it('rechaza 1000000000000.00 con MONTO_MAXIMO', async () => {
    await EsperarRechazo({ p_monto: '1000000000000.00' }, 'MONTO_MAXIMO');
  });

  it('rechaza 10.555 con MONTO_DECIMALES', async () => {
    await EsperarRechazo({ p_monto: '10.555' }, 'MONTO_DECIMALES');
  });

  it('rechaza un tipo distinto de INGRESO/GASTO con TIPO_INVALIDO', async () => {
    await EsperarRechazo({ p_tipo: 'EGRESO' }, 'TIPO_INVALIDO');
  });

  it('rechaza una categoría de ingreso en un gasto con CATEGORIA_INVALIDA', async () => {
    await EsperarRechazo({ p_id_categoria: usuario.categorias.ingreso.id }, 'CATEGORIA_INVALIDA');
  });

  it('rechaza una categoría de otro usuario con CATEGORIA_INVALIDA', async () => {
    await EsperarRechazo({ p_id_categoria: usuarioB.categorias.gasto.id }, 'CATEGORIA_INVALIDA');
  });

  it('rechaza la fecha de pasado mañana en UTC con FECHA_INVALIDA', async () => {
    await EsperarRechazo({ p_fecha: ObtenerFechaUtc(2) }, 'FECHA_INVALIDA');
  });

  it('rechaza la fecha nula con FECHA_INVALIDA', async () => {
    await EsperarRechazo({ p_fecha: null }, 'FECHA_INVALIDA');
  });

  it('con p_simular_falla no queda movimiento y el saldo no cambia', async () => {
    await EsperarRechazo({ p_simular_falla: true }, 'FALLA_SIMULADA');
  });

  it('el saldo sigue igual a ingresos menos gastos', async () => {
    expect(await ObtenerSaldo(usuario.cliente)).toBe(await CalcularSaldoEsperado(usuario.cliente));
  });
});
