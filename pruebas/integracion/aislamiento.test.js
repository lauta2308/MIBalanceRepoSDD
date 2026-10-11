import { beforeAll, describe, expect, it } from 'vitest';
import {
  AgregarMovimientoPrueba,
  CrearClientePrueba,
  ObtenerFechaUtc,
  ObtenerSaldo,
  ObtenerUsuarioCompartido,
} from './ayudantes.js';

// RNF-03 contra la API, sin interfaz: AC-116, AC-117, AC-118, FR-025, FR-028, FR-034.
describe('aislamiento entre usuarios y escritura directa', () => {
  let a;
  let b;
  let idMovimientoB;

  beforeAll(async () => {
    a = await ObtenerUsuarioCompartido('a');
    b = await ObtenerUsuarioCompartido('b');
    idMovimientoB = await AgregarMovimientoPrueba(b.cliente, b.categorias, { tipo: 'GASTO', monto: '123.45' });
  });

  async function LeerMovimientoB() {
    const { data } = await b.cliente.from('bav_movimientos').select('*').eq('id', idMovimientoB).single();
    return data;
  }

  describe('A no ve datos de B (AC-116)', () => {
    it('cuenta de B', async () => {
      const { data, error } = await a.cliente.from('bat_cuentas').select('*').eq('id', b.cuenta.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('categorías de B', async () => {
      const { data } = await a.cliente.from('bat_categorias').select('*').in('id', b.categorias.todas.map((c) => c.id));
      expect(data).toEqual([]);
      const { data: porCuenta } = await a.cliente.from('bat_categorias').select('*').eq('id_cuenta', b.cuenta.id);
      expect(porCuenta).toEqual([]);
    });

    it('movimientos de B en la tabla y en la vista', async () => {
      const { data: tabla } = await a.cliente.from('bat_movimientos').select('*').eq('id', idMovimientoB);
      expect(tabla).toEqual([]);
      const { data: vista } = await a.cliente.from('bav_movimientos').select('*').eq('id_cuenta', b.cuenta.id);
      expect(vista).toEqual([]);
    });

    it('A solo ve su propia cuenta', async () => {
      const { data } = await a.cliente.from('bat_cuentas').select('id');
      expect(data).toEqual([{ id: a.cuenta.id }]);
    });
  });

  it('A no puede editar ni eliminar por RPC un movimiento de B (AC-117)', async () => {
    const saldoB = await ObtenerSaldo(b.cliente);
    const edicion = await a.cliente.rpc('basp_editar_movimiento', {
      p_id_movimiento: idMovimientoB,
      p_tipo: 'GASTO',
      p_monto: '1',
      p_id_categoria: a.categorias.gasto.id,
      p_fecha: ObtenerFechaUtc(0),
    });
    expect(edicion.error?.message).toBe('MOVIMIENTO_INEXISTENTE');
    const eliminacion = await a.cliente.rpc('basp_eliminar_movimiento', { p_id_movimiento: idMovimientoB });
    expect(eliminacion.error?.message).toBe('MOVIMIENTO_INEXISTENTE');
    expect(await LeerMovimientoB()).toMatchObject({ monto: '123.45', tipo: 'GASTO' });
    expect(await ObtenerSaldo(b.cliente)).toBe(saldoB);
  });

  it('A no puede crear un movimiento con una categoría de B (AC-118)', async () => {
    const saldoA = await ObtenerSaldo(a.cliente);
    const saldoB = await ObtenerSaldo(b.cliente);
    const { error } = await a.cliente.rpc('basp_agregar_movimiento', {
      p_tipo: 'GASTO',
      p_monto: '10',
      p_id_categoria: b.categorias.gasto.id,
      p_fecha: ObtenerFechaUtc(0),
    });
    expect(error?.message).toBe('CATEGORIA_INVALIDA');
    expect(await ObtenerSaldo(a.cliente)).toBe(saldoA);
    expect(await ObtenerSaldo(b.cliente)).toBe(saldoB);
  });

  describe('sin escritura directa en las tablas (FR-034)', () => {
    const PERMISO_DENEGADO = '42501';

    it('insert directo rechazado en las tres tablas', async () => {
      const cuenta = await a.cliente.from('bat_cuentas').insert({ id_usuario: a.idUsuario });
      expect(cuenta.error?.code).toBe(PERMISO_DENEGADO);
      const categoria = await a.cliente.from('bat_categorias').insert({ id_cuenta: a.cuenta.id, nombre: 'Intrusa', tipo: 'GASTO' });
      expect(categoria.error?.code).toBe(PERMISO_DENEGADO);
      const movimiento = await a.cliente.from('bat_movimientos').insert({
        id_cuenta: a.cuenta.id,
        id_categoria: a.categorias.gasto.id,
        tipo: 'GASTO',
        monto: '1.00',
        fecha: ObtenerFechaUtc(0),
      });
      expect(movimiento.error?.code).toBe(PERMISO_DENEGADO);
    });

    it('update directo del saldo propio rechazado', async () => {
      const saldo = await ObtenerSaldo(a.cliente);
      const { error } = await a.cliente.from('bat_cuentas').update({ saldo: '999999' }).eq('id', a.cuenta.id);
      expect(error?.code).toBe(PERMISO_DENEGADO);
      expect(await ObtenerSaldo(a.cliente)).toBe(saldo);
    });

    it('update y delete directos de movimientos rechazados', async () => {
      const idPropio = await AgregarMovimientoPrueba(a.cliente, a.categorias, { tipo: 'INGRESO', monto: '5' });
      const actualizacion = await a.cliente.from('bat_movimientos').update({ monto: '1.00' }).eq('id', idPropio);
      expect(actualizacion.error?.code).toBe(PERMISO_DENEGADO);
      const borrado = await a.cliente.from('bat_movimientos').delete().eq('id', idPropio);
      expect(borrado.error?.code).toBe(PERMISO_DENEGADO);
      const { data } = await a.cliente.from('bav_movimientos').select('monto').eq('id', idPropio).single();
      expect(data.monto).toBe('5.00');
    });

    it('delete directo de la cuenta rechazado', async () => {
      const { error } = await a.cliente.from('bat_cuentas').delete().eq('id', a.cuenta.id);
      expect(error?.code).toBe(PERMISO_DENEGADO);
    });

    it('"Pago Realizado" y "Pago Ingresado" no se pueden editar ni eliminar (FR-028, AC-96 servidor)', async () => {
      for (const categoria of [a.categorias.gasto, a.categorias.ingreso]) {
        const edicion = await a.cliente.from('bat_categorias').update({ nombre: 'Otra' }).eq('id', categoria.id);
        expect(edicion.error?.code).toBe(PERMISO_DENEGADO);
        const borrado = await a.cliente.from('bat_categorias').delete().eq('id', categoria.id);
        expect(borrado.error?.code).toBe(PERMISO_DENEGADO);
      }
      const { data } = await a.cliente.from('bat_categorias').select('nombre').eq('es_por_defecto', true);
      expect(data.map((c) => c.nombre).sort()).toEqual(['Pago Ingresado', 'Pago Realizado']);
    });
  });

  describe('sin sesión no hay acceso', () => {
    const sinSesion = CrearClientePrueba();

    it.each(['bat_cuentas', 'bat_categorias', 'bat_movimientos', 'bav_movimientos'])('no puede leer %s', async (tabla) => {
      const { data, error } = await sinSesion.from(tabla).select('*');
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('no puede llamar a ninguna basp_* ni a la función del trigger', async () => {
      const llamadas = [
        sinSesion.rpc('basp_obtener_cuenta'),
        sinSesion.rpc('basp_agregar_movimiento', {
          p_tipo: 'GASTO',
          p_monto: '1',
          p_id_categoria: a.categorias.gasto.id,
          p_fecha: ObtenerFechaUtc(0),
        }),
        sinSesion.rpc('basp_editar_movimiento', {
          p_id_movimiento: idMovimientoB,
          p_tipo: 'GASTO',
          p_monto: '1',
          p_id_categoria: b.categorias.gasto.id,
          p_fecha: ObtenerFechaUtc(0),
        }),
        sinSesion.rpc('basp_eliminar_movimiento', { p_id_movimiento: idMovimientoB }),
        sinSesion.rpc('batf_crear_cuenta_usuario'),
      ];
      for (const { error } of await Promise.all(llamadas)) {
        expect(error).not.toBeNull();
      }
      expect(await LeerMovimientoB()).toMatchObject({ monto: '123.45' });
    });

    it('un usuario autenticado tampoco puede llamar a la función del trigger', async () => {
      const { error } = await a.cliente.rpc('batf_crear_cuenta_usuario');
      expect(error).not.toBeNull();
      const { data } = await a.cliente.from('bat_cuentas').select('id');
      expect(data).toHaveLength(1);
    });
  });
});
