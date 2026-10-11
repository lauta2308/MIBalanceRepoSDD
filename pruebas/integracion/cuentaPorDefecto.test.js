import { describe, expect, inject, it } from 'vitest';

// AC-09, FR-001: estado de la cuenta del usuario A tomado apenas se creó (configuracionGlobal.js).
describe('cuenta por defecto', () => {
  const estado = inject('estadoInicialA');

  it('un usuario nuevo tiene una única cuenta "Mi Cuenta" en USD con saldo 0.00', () => {
    expect(estado.cuentas).toHaveLength(1);
    expect(estado.cuentas[0]).toMatchObject({ nombre: 'Mi Cuenta', codigo_moneda: 'USD' });
    expect(estado.cuenta).toMatchObject({ nombre: 'Mi Cuenta', codigo_moneda: 'USD', saldo: '0.00' });
  });

  it('tiene exactamente "Pago Realizado" (GASTO) y "Pago Ingresado" (INGRESO) por defecto', () => {
    const categorias = estado.categorias
      .map(({ nombre, tipo, es_por_defecto }) => ({ nombre, tipo, es_por_defecto }))
      .sort((primera, segunda) => primera.tipo.localeCompare(segunda.tipo));
    expect(categorias).toEqual([
      { nombre: 'Pago Realizado', tipo: 'GASTO', es_por_defecto: true },
      { nombre: 'Pago Ingresado', tipo: 'INGRESO', es_por_defecto: true },
    ]);
  });
});
