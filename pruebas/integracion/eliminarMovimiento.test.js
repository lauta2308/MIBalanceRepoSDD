import { beforeAll, describe, expect, it } from 'vitest';
import {
  AgregarMovimientoPrueba,
  CalcularSaldoEsperado,
  EstablecerSaldo,
  ObtenerSaldo,
  ObtenerUsuarioCompartido,
} from './ayudantes.js';

describe('basp_eliminar_movimiento', () => {
  let usuario;
  let usuarioB;

  beforeAll(async () => {
    usuario = await ObtenerUsuarioCompartido('a');
    usuarioB = await ObtenerUsuarioCompartido('b');
  });

  async function PrepararIngresoDe1000() {
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '4000.00');
    const id = await AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, { tipo: 'INGRESO', monto: '1000' });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('5000.00');
    return id;
  }

  async function Existe(cliente, id) {
    const { data } = await cliente.from('bav_movimientos').select('id').eq('id', id);
    return data.length === 1;
  }

  it('eliminar un ingreso de 1.000 lleva el saldo de 5.000 a 4.000 (AC-68)', async () => {
    const id = await PrepararIngresoDe1000();
    const { error } = await usuario.cliente.rpc('basp_eliminar_movimiento', { p_id_movimiento: id });
    expect(error).toBeNull();
    expect(await Existe(usuario.cliente, id)).toBe(false);
    expect(await ObtenerSaldo(usuario.cliente)).toBe('4000.00');
  });

  it('eliminar un gasto devuelve su monto al saldo', async () => {
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '1000.00');
    const id = await AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, { tipo: 'GASTO', monto: '250.50' });
    await usuario.cliente.rpc('basp_eliminar_movimiento', { p_id_movimiento: id });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('1000.00');
  });

  it('con un movimiento de otro usuario → MOVIMIENTO_INEXISTENTE y el de B sigue', async () => {
    const idB = await AgregarMovimientoPrueba(usuarioB.cliente, usuarioB.categorias, { tipo: 'GASTO', monto: '300' });
    const saldoB = await ObtenerSaldo(usuarioB.cliente);
    const { error } = await usuario.cliente.rpc('basp_eliminar_movimiento', { p_id_movimiento: idB });
    expect(error?.message).toBe('MOVIMIENTO_INEXISTENTE');
    expect(await Existe(usuarioB.cliente, idB)).toBe(true);
    expect(await ObtenerSaldo(usuarioB.cliente)).toBe(saldoB);
  });

  it('con un id que no existe → MOVIMIENTO_INEXISTENTE', async () => {
    const { error } = await usuario.cliente.rpc('basp_eliminar_movimiento', {
      p_id_movimiento: '00000000-0000-4000-8000-000000000000',
    });
    expect(error?.message).toBe('MOVIMIENTO_INEXISTENTE');
  });

  it('con p_simular_falla el movimiento sigue y el saldo no cambia (AC-123)', async () => {
    const id = await PrepararIngresoDe1000();
    const { error } = await usuario.cliente.rpc('basp_eliminar_movimiento', {
      p_id_movimiento: id,
      p_simular_falla: true,
    });
    expect(error?.message).toBe('FALLA_SIMULADA');
    expect(await Existe(usuario.cliente, id)).toBe(true);
    expect(await ObtenerSaldo(usuario.cliente)).toBe('5000.00');
  });

  it('el saldo sigue igual a ingresos menos gastos', async () => {
    expect(await ObtenerSaldo(usuario.cliente)).toBe(await CalcularSaldoEsperado(usuario.cliente));
  });
});
