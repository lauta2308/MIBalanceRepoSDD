import { beforeAll, describe, expect, it } from 'vitest';
import {
  ACentavos,
  AgregarMovimientoPrueba,
  CalcularSaldoEsperado,
  DeCentavos,
  EstablecerSaldo,
  ObtenerFechaUtc,
  ObtenerSaldo,
  ObtenerUsuarioCompartido,
} from './ayudantes.js';

describe('basp_agregar_movimiento: casos válidos', () => {
  let usuario;

  beforeAll(async () => {
    usuario = await ObtenerUsuarioCompartido('a');
  });

  const Agregar = (datos) => AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, datos);

  it('un gasto de 1500 lleva el saldo de 10.000 a 8.500 (AC-43)', async () => {
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '10000.00');
    const idMovimiento = await Agregar({ tipo: 'GASTO', monto: '1500' });
    expect(idMovimiento).toMatch(/^[0-9a-f-]{36}$/);
    expect(await ObtenerSaldo(usuario.cliente)).toBe('8500.00');

    const { data } = await usuario.cliente.from('bav_movimientos').select('*').eq('id', idMovimiento).single();
    expect(data).toMatchObject({ tipo: 'GASTO', monto: '1500.00', nombre_categoria: 'Pago Realizado' });
  });

  it('un gasto de 1500 resta 1500 al saldo', async () => {
    const antes = ACentavos(await ObtenerSaldo(usuario.cliente));
    await Agregar({ tipo: 'GASTO', monto: '1500' });
    expect(await ObtenerSaldo(usuario.cliente)).toBe(DeCentavos(antes - 150000n));
  });

  it('un ingreso de 1000 lleva el saldo de 10.000 a 11.000 (AC-44)', async () => {
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '10000.00');
    await Agregar({ tipo: 'INGRESO', monto: '1000' });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('11000.00');
  });

  it('0,10 + 0,20 = 0,30 exacto (AC-121)', async () => {
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '0.00');
    await Agregar({ tipo: 'INGRESO', monto: '0.10' });
    await Agregar({ tipo: 'INGRESO', monto: '0.20' });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('0.30');
  });

  it('dos ingresos de 999999999999.99 suman 1999999999999.98 sin desbordar (AC-122)', async () => {
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '0.00');
    await Agregar({ tipo: 'INGRESO', monto: '999999999999.99' });
    await Agregar({ tipo: 'INGRESO', monto: '999999999999.99' });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('1999999999999.98');
  });

  it('un gasto mayor que el saldo deja el saldo negativo (AC-59)', async () => {
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '1000.00');
    await Agregar({ tipo: 'GASTO', monto: '2000' });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('-1000.00');
  });

  it('acepta la fecha de mañana en UTC', async () => {
    const antes = ACentavos(await ObtenerSaldo(usuario.cliente));
    await Agregar({ tipo: 'INGRESO', monto: '5', fecha: ObtenerFechaUtc(1) });
    expect(await ObtenerSaldo(usuario.cliente)).toBe(DeCentavos(antes + 500n));
  });

  it('el saldo es igual a ingresos menos gastos', async () => {
    expect(await ObtenerSaldo(usuario.cliente)).toBe(await CalcularSaldoEsperado(usuario.cliente));
  });
});
