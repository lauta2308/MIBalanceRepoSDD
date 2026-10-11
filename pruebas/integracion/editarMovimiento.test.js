import { beforeAll, describe, expect, it } from 'vitest';
import {
  AgregarMovimientoPrueba,
  CalcularSaldoEsperado,
  EstablecerSaldo,
  ObtenerFechaUtc,
  ObtenerSaldo,
  ObtenerUsuarioCompartido,
} from './ayudantes.js';

describe('basp_editar_movimiento', () => {
  let usuario;
  let usuarioB;

  beforeAll(async () => {
    usuario = await ObtenerUsuarioCompartido('a');
    usuarioB = await ObtenerUsuarioCompartido('b');
  });

  // Deja un saldo de 10.000 que incluye un gasto de 3.000 del 17/09/2026 y devuelve su id.
  async function PrepararGastoDe3000() {
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '13000.00');
    const id = await AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, {
      tipo: 'GASTO',
      monto: '3000.00',
      fecha: '2026-09-17',
    });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('10000.00');
    return id;
  }

  async function LeerMovimiento(id) {
    const { data } = await usuario.cliente.from('bav_movimientos').select('*').eq('id', id).single();
    return data;
  }

  function Editar(parametros) {
    return usuario.cliente.rpc('basp_editar_movimiento', parametros);
  }

  it('cambia monto y fecha y recalcula el saldo: 10.000 → 11.000 (AC-62 sin el cambio de categoría)', async () => {
    const id = await PrepararGastoDe3000();
    const { error } = await Editar({
      p_id_movimiento: id,
      p_tipo: 'GASTO',
      p_monto: '2000',
      p_id_categoria: usuario.categorias.gasto.id,
      p_fecha: '2026-09-16',
    });
    expect(error).toBeNull();
    expect(await LeerMovimiento(id)).toMatchObject({ tipo: 'GASTO', monto: '2000.00', fecha: '2026-09-16' });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('11000.00');
  });

  it('cambia un gasto a ingreso en "Pago Ingresado": 10.000 → 16.000 (AC-63)', async () => {
    const id = await PrepararGastoDe3000();
    const { error } = await Editar({
      p_id_movimiento: id,
      p_tipo: 'INGRESO',
      p_monto: '3000',
      p_id_categoria: usuario.categorias.ingreso.id,
      p_fecha: '2026-09-17',
    });
    expect(error).toBeNull();
    expect(await LeerMovimiento(id)).toMatchObject({ tipo: 'INGRESO', monto: '3000.00', nombre_categoria: 'Pago Ingresado' });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('16000.00');
  });

  it('no cambia creado_en ni el orden de la lista (AC-37)', async () => {
    const fecha = '1995-10-01';
    const idCafe = await AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, { tipo: 'GASTO', monto: '800', fecha });
    const idMercado = await AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, { tipo: 'GASTO', monto: '1500', fecha });
    const antes = await LeerMovimiento(idCafe);

    await Editar({
      p_id_movimiento: idCafe,
      p_tipo: 'GASTO',
      p_monto: '900',
      p_id_categoria: usuario.categorias.gasto.id,
      p_fecha: fecha,
    });

    const despues = await LeerMovimiento(idCafe);
    expect(despues.creado_en).toBe(antes.creado_en);
    const { data } = await usuario.cliente
      .from('bav_movimientos')
      .select('id')
      .eq('fecha', fecha)
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false });
    expect(data.map((fila) => fila.id)).toEqual([idMercado, idCafe]);
  });

  describe('rechazos: el movimiento y el saldo no cambian', () => {
    let id;

    beforeAll(async () => {
      id = await PrepararGastoDe3000();
    });

    async function EsperarRechazo(parametros, codigoEsperado) {
      const { error } = await Editar({
        p_id_movimiento: id,
        p_tipo: 'GASTO',
        p_monto: '2000',
        p_id_categoria: usuario.categorias.gasto.id,
        p_fecha: '2026-09-17',
        ...parametros,
      });
      expect(error?.message).toBe(codigoEsperado);
      expect(await LeerMovimiento(id)).toMatchObject({ tipo: 'GASTO', monto: '3000.00', fecha: '2026-09-17' });
      expect(await ObtenerSaldo(usuario.cliente)).toBe('10000.00');
    }

    it.each([['0'], ['-50']])('monto %s → MONTO_NO_POSITIVO (AC-47, AC-49)', async (monto) => {
      await EsperarRechazo({ p_monto: monto }, 'MONTO_NO_POSITIVO');
    });

    it('monto vacío → MONTO_NO_POSITIVO (AC-47)', async () => {
      await EsperarRechazo({ p_monto: null }, 'MONTO_NO_POSITIVO');
    });

    it('1000000000000.00 → MONTO_MAXIMO (AC-48)', async () => {
      await EsperarRechazo({ p_monto: '1000000000000.00' }, 'MONTO_MAXIMO');
    });

    it('10.555 → MONTO_DECIMALES (AC-49)', async () => {
      await EsperarRechazo({ p_monto: '10.555' }, 'MONTO_DECIMALES');
    });

    it('categoría de otro tipo → CATEGORIA_INVALIDA (AC-49)', async () => {
      await EsperarRechazo({ p_id_categoria: usuario.categorias.ingreso.id }, 'CATEGORIA_INVALIDA');
    });

    it('categoría de otro usuario → CATEGORIA_INVALIDA', async () => {
      await EsperarRechazo({ p_id_categoria: usuarioB.categorias.gasto.id }, 'CATEGORIA_INVALIDA');
    });

    it('fecha de pasado mañana en UTC → FECHA_INVALIDA', async () => {
      await EsperarRechazo({ p_fecha: ObtenerFechaUtc(2) }, 'FECHA_INVALIDA');
    });

    it('falla simulada en la edición → todo queda como antes (AC-123)', async () => {
      await EsperarRechazo({ p_simular_falla: true }, 'FALLA_SIMULADA');
    });

    it('falla simulada en el cambio de tipo → todo queda como antes (AC-123)', async () => {
      await EsperarRechazo(
        { p_tipo: 'INGRESO', p_monto: '3000', p_id_categoria: usuario.categorias.ingreso.id, p_simular_falla: true },
        'FALLA_SIMULADA',
      );
    });
  });

  it('un movimiento de otro usuario → MOVIMIENTO_INEXISTENTE y el de B no cambia', async () => {
    const idB = await AgregarMovimientoPrueba(usuarioB.cliente, usuarioB.categorias, { tipo: 'GASTO', monto: '700' });
    const saldoB = await ObtenerSaldo(usuarioB.cliente);
    const { error } = await Editar({
      p_id_movimiento: idB,
      p_tipo: 'GASTO',
      p_monto: '1',
      p_id_categoria: usuario.categorias.gasto.id,
      p_fecha: ObtenerFechaUtc(0),
    });
    expect(error?.message).toBe('MOVIMIENTO_INEXISTENTE');
    const { data } = await usuarioB.cliente.from('bav_movimientos').select('monto').eq('id', idB).single();
    expect(data.monto).toBe('700.00');
    expect(await ObtenerSaldo(usuarioB.cliente)).toBe(saldoB);
  });

  it('el saldo sigue igual a ingresos menos gastos', async () => {
    expect(await ObtenerSaldo(usuario.cliente)).toBe(await CalcularSaldoEsperado(usuario.cliente));
  });
});
