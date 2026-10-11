import { beforeAll, describe, expect, it } from 'vitest';
import { AgregarMovimientoPrueba, ObtenerUsuarioCompartido } from './ayudantes.js';

// Las pruebas usan fechas antiguas propias (1990) para no depender de los demás movimientos
// del usuario compartido.
describe('lista de movimientos (bav_movimientos)', () => {
  let usuario;
  let usuarioA;

  beforeAll(async () => {
    usuario = await ObtenerUsuarioCompartido('b');
    usuarioA = await ObtenerUsuarioCompartido('a');
  });

  it('ordena por fecha y, dentro de la fecha, por momento del alta (AC-36)', async () => {
    const Agregar = (datos) => AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, datos);
    const idGastoSeptiembre = await Agregar({ tipo: 'GASTO', monto: '1500.00', fecha: '1990-09-17' });
    const idIngresoOctubre = await Agregar({ tipo: 'INGRESO', monto: '50000.00', fecha: '1990-10-01' });
    const idGastoOctubre = await Agregar({ tipo: 'GASTO', monto: '800.00', fecha: '1990-10-01' });

    const { data, error } = await usuario.cliente
      .from('bav_movimientos')
      .select('*')
      .in('fecha', ['1990-09-17', '1990-10-01'])
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false });
    expect(error).toBeNull();
    expect(data.map((fila) => fila.id)).toEqual([idGastoOctubre, idIngresoOctubre, idGastoSeptiembre]);
    expect(data[0]).toMatchObject({ tipo: 'GASTO', monto: '800.00', fecha: '1990-10-01', nombre_categoria: 'Pago Realizado' });
    expect(data[1]).toMatchObject({ tipo: 'INGRESO', monto: '50000.00', nombre_categoria: 'Pago Ingresado' });
    // Montos como texto con dos decimales (research R3).
    for (const fila of data) expect(typeof fila.monto).toBe('string');
  });

  it('pagina de a 50 con el total exacto (120 movimientos, AC-38)', async () => {
    const fecha = '1990-01-15';
    const { count: cantidadAntes } = await usuario.cliente
      .from('bav_movimientos')
      .select('id', { count: 'exact', head: true });

    for (let tanda = 0; tanda < 6; tanda += 1) {
      await Promise.all(
        Array.from({ length: 20 }, () =>
          AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, { tipo: 'INGRESO', monto: '1.00', fecha }),
        ),
      );
    }

    const ConsultarPagina = (desde) =>
      usuario.cliente
        .from('bav_movimientos')
        .select('*', { count: 'exact' })
        .eq('fecha', fecha)
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false })
        .order('id', { ascending: false })
        .range(desde, desde + 49);

    const primera = await ConsultarPagina(0);
    const segunda = await ConsultarPagina(50);
    const tercera = await ConsultarPagina(100);
    expect(primera.count).toBe(120);
    expect(primera.data).toHaveLength(50);
    expect(segunda.data).toHaveLength(50);
    expect(tercera.data).toHaveLength(20);
    const ids = new Set([...primera.data, ...segunda.data, ...tercera.data].map((fila) => fila.id));
    expect(ids.size).toBe(120);

    const { count: cantidadDespues } = await usuario.cliente
      .from('bav_movimientos')
      .select('id', { count: 'exact', head: true });
    expect(cantidadDespues).toBe(cantidadAntes + 120);
  });

  it('el usuario B no ve filas de A', async () => {
    const idMovimientoA = await AgregarMovimientoPrueba(usuarioA.cliente, usuarioA.categorias, {
      tipo: 'GASTO',
      monto: '10.00',
    });
    const { data, error } = await usuario.cliente.from('bav_movimientos').select('*').eq('id', idMovimientoA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const { data: porCuenta } = await usuario.cliente
      .from('bav_movimientos')
      .select('id')
      .eq('id_cuenta', usuarioA.cuenta.id);
    expect(porCuenta).toEqual([]);
  });
});
