import { beforeAll, describe, expect, it } from 'vitest';
import {
  ACentavos,
  AgregarMovimientoPrueba,
  CalcularSaldoEsperado,
  CrearClienteConToken,
  DeCentavos,
  EstablecerSaldo,
  ObtenerFechaUtc,
  ObtenerSaldo,
  ObtenerTodosLosMovimientos,
  ObtenerUsuarioCompartido,
} from './ayudantes.js';

describe('consistencia del saldo (RNF-05, FR-004)', () => {
  let usuario;

  beforeAll(async () => {
    usuario = await ObtenerUsuarioCompartido('secuencia');
  });

  const IdCategoria = (tipo) => (tipo === 'GASTO' ? usuario.categorias.gasto.id : usuario.categorias.ingreso.id);

  async function VerificarInvariante() {
    expect(await ObtenerSaldo(usuario.cliente)).toBe(await CalcularSaldoEsperado(usuario.cliente));
  }

  it('secuencia fija de 20 altas, 20 ediciones (10 con cambio de tipo) y 10 eliminaciones (AC-125)', async () => {
    const ids = [];
    const tipos = [];
    let ediciones = 0;
    let cambiosDeTipo = 0;
    let eliminaciones = 0;

    async function Editar(indice) {
      const cambiaTipo = indice % 2 === 0;
      const tipo = cambiaTipo ? (tipos[indice] === 'GASTO' ? 'INGRESO' : 'GASTO') : tipos[indice];
      const { error } = await usuario.cliente.rpc('basp_editar_movimiento', {
        p_id_movimiento: ids[indice],
        p_tipo: tipo,
        p_monto: `${(indice + 3) * 47}.${String((indice * 13) % 100).padStart(2, '0')}`,
        p_id_categoria: IdCategoria(tipo),
        p_fecha: ObtenerFechaUtc(-indice),
      });
      expect(error).toBeNull();
      tipos[indice] = tipo;
      ediciones += 1;
      if (cambiaTipo) cambiosDeTipo += 1;
      await VerificarInvariante();
    }

    for (let indice = 0; indice < 20; indice += 1) {
      const tipo = indice % 3 === 0 ? 'GASTO' : 'INGRESO';
      ids.push(
        await AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, {
          tipo,
          monto: `${(indice + 1) * 111}.${String((indice * 7) % 100).padStart(2, '0')}`,
          fecha: ObtenerFechaUtc(-indice),
        }),
      );
      tipos.push(tipo);
      await VerificarInvariante();

      if (indice >= 1) await Editar(indice - 1);

      if (indice % 2 === 1) {
        const { error } = await usuario.cliente.rpc('basp_eliminar_movimiento', { p_id_movimiento: ids[indice - 1] });
        expect(error).toBeNull();
        eliminaciones += 1;
        await VerificarInvariante();
      }
    }
    await Editar(19);

    expect({ ediciones, cambiosDeTipo, eliminaciones }).toEqual({ ediciones: 20, cambiosDeTipo: 10, eliminaciones: 10 });
  });

  it('20 altas simultáneas desde dos clientes del mismo usuario dejan el saldo exacto (FR-004)', async () => {
    const otroCliente = CrearClienteConToken(usuario.tokenAcceso);
    const antes = ACentavos(await ObtenerSaldo(usuario.cliente));
    await Promise.all(
      Array.from({ length: 20 }, (_, indice) =>
        AgregarMovimientoPrueba(indice % 2 === 0 ? usuario.cliente : otroCliente, usuario.categorias, {
          tipo: indice % 4 === 0 ? 'GASTO' : 'INGRESO',
          monto: `${indice + 1}.10`,
        }),
      ),
    );
    // Ingresos: índices no múltiplos de 4; gastos: múltiplos de 4. Monto = (i + 1) + 0,10.
    let delta = 0n;
    for (let indice = 0; indice < 20; indice += 1) {
      const centavos = BigInt(indice + 1) * 100n + 10n;
      delta += indice % 4 === 0 ? -centavos : centavos;
    }
    expect(await ObtenerSaldo(usuario.cliente)).toBe(DeCentavos(antes + delta));
    await VerificarInvariante();
  });

  it('con falla simulada en alta, edición, cambio a ingreso y eliminación todo queda igual (AC-123)', async () => {
    await EstablecerSaldo(usuario.cliente, usuario.categorias, '13000.00');
    const idGasto = await AgregarMovimientoPrueba(usuario.cliente, usuario.categorias, { tipo: 'GASTO', monto: '3000' });
    expect(await ObtenerSaldo(usuario.cliente)).toBe('10000.00');
    const cantidad = (await ObtenerTodosLosMovimientos(usuario.cliente)).length;

    const intentos = [
      usuario.cliente.rpc('basp_agregar_movimiento', {
        p_tipo: 'GASTO',
        p_monto: '3000',
        p_id_categoria: IdCategoria('GASTO'),
        p_fecha: ObtenerFechaUtc(0),
        p_simular_falla: true,
      }),
      usuario.cliente.rpc('basp_editar_movimiento', {
        p_id_movimiento: idGasto,
        p_tipo: 'GASTO',
        p_monto: '2000',
        p_id_categoria: IdCategoria('GASTO'),
        p_fecha: ObtenerFechaUtc(0),
        p_simular_falla: true,
      }),
      usuario.cliente.rpc('basp_editar_movimiento', {
        p_id_movimiento: idGasto,
        p_tipo: 'INGRESO',
        p_monto: '3000',
        p_id_categoria: IdCategoria('INGRESO'),
        p_fecha: ObtenerFechaUtc(0),
        p_simular_falla: true,
      }),
      usuario.cliente.rpc('basp_eliminar_movimiento', { p_id_movimiento: idGasto, p_simular_falla: true }),
    ];
    for (const intento of intentos) {
      const { error } = await intento;
      expect(error?.message).toBe('FALLA_SIMULADA');
      expect(await ObtenerSaldo(usuario.cliente)).toBe('10000.00');
    }

    const movimientos = await ObtenerTodosLosMovimientos(usuario.cliente);
    expect(movimientos).toHaveLength(cantidad);
    expect(movimientos.find((movimiento) => movimiento.id === idGasto)).toMatchObject({ tipo: 'GASTO', monto: '3000.00' });
    await VerificarInvariante();
  });
});
