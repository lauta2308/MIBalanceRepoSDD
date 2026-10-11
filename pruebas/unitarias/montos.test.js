import { describe, expect, it } from 'vitest';
import {
  ConvertirEntradaAMontoApi,
  ConvertirMontoApiAEntrada,
  FiltrarEntradaMonto,
  FormatearMonto,
  FormatearMontoConSigno,
  ObtenerSignoMonto,
  ValidarMonto,
} from '../../src/utilidades/montos.js';

describe('FormatearMonto', () => {
  it.each([
    ['1500.5', '1.500,50'],
    ['1500.50', '1.500,50'],
    ['-1000', '-1.000,00'],
    ['0', '0,00'],
    ['0.00', '0,00'],
    ['0.10', '0,10'],
    ['999999999999.99', '999.999.999.999,99'],
    ['1999999999999.98', '1.999.999.999.999,98'],
    ['-8499.50', '-8.499,50'],
  ])('%s → %s', (entrada, salida) => {
    expect(FormatearMonto(entrada)).toBe(salida);
  });

  it('formatea un saldo de 16 dígitos enteros sin perder precisión', () => {
    expect(FormatearMonto('1234567890123456.78')).toBe('1.234.567.890.123.456,78');
  });
});

describe('FormatearMontoConSigno', () => {
  it('antepone "-" a los gastos y "+" a los ingresos', () => {
    expect(FormatearMontoConSigno('1500.00', 'GASTO')).toBe('-1.500,00');
    expect(FormatearMontoConSigno('1000.00', 'INGRESO')).toBe('+1.000,00');
    expect(FormatearMontoConSigno('520.50', 'INGRESO')).toBe('+520,50');
  });
});

describe('FiltrarEntradaMonto', () => {
  it.each([
    ['1500000', '1.500.000'],
    ['1500,50', '1.500,50'],
    ['abc50', '50'],
    ['-50', '50'],
    ['10,555', '10,55'],
    ['$1.500,50', '1.500,50'],
    ['007', '7'],
    [',5', '0,5'],
    ['1500,', '1.500,'],
    ['0,5', '0,5'],
    ['0', '0'],
    ['000', '0'],
    ['1,2,3', '1,23'],
    ['', ''],
    ['abc', ''],
    ['1.5000', '15.000'],
  ])('%s → %s', (entrada, salida) => {
    expect(FiltrarEntradaMonto(entrada)).toBe(salida);
  });
});

describe('ConvertirEntradaAMontoApi', () => {
  it.each([
    ['1.500,5', '1500.50'],
    ['1.500,50', '1500.50'],
    ['1500,', '1500.00'],
    ['0,5', '0.50'],
    ['0,', '0.00'],
    ['7', '7.00'],
    ['999.999.999.999,99', '999999999999.99'],
    ['', null],
  ])('%s → %s', (entrada, salida) => {
    expect(ConvertirEntradaAMontoApi(entrada)).toBe(salida);
  });
});

describe('ConvertirMontoApiAEntrada', () => {
  it.each([
    ['1500.00', '1.500,00'],
    ['1500.50', '1.500,50'],
    ['0.10', '0,10'],
  ])('%s → %s', (entrada, salida) => {
    expect(ConvertirMontoApiAEntrada(entrada)).toBe(salida);
  });
});

describe('ValidarMonto', () => {
  it('rechaza vacío y 0', () => {
    expect(ValidarMonto(null)).toBe('El monto debe ser mayor a 0.');
    expect(ValidarMonto('0.00')).toBe('El monto debe ser mayor a 0.');
  });

  it('rechaza más de 999.999.999.999,99', () => {
    expect(ValidarMonto('1000000000000.00')).toBe('El monto máximo es 999.999.999.999,99.');
  });

  it('acepta el tope y los montos positivos', () => {
    expect(ValidarMonto('999999999999.99')).toBeNull();
    expect(ValidarMonto('0.01')).toBeNull();
    expect(ValidarMonto('1500.50')).toBeNull();
  });
});

describe('ObtenerSignoMonto', () => {
  it('devuelve 1, -1 o 0', () => {
    expect(ObtenerSignoMonto('8500.00')).toBe(1);
    expect(ObtenerSignoMonto('-1000.00')).toBe(-1);
    expect(ObtenerSignoMonto('0.00')).toBe(0);
    expect(ObtenerSignoMonto('0')).toBe(0);
  });
});
