import { describe, expect, it } from 'vitest';
import { EsMovimientoInexistente, TraducirError } from '../../src/servicios/errores.js';

const ErrorApi = (message) => ({ message, code: 'P0001', details: null, hint: null });

describe('TraducirError', () => {
  it('traduce las validaciones de monto', () => {
    expect(TraducirError(ErrorApi('MONTO_NO_POSITIVO'), 'AGREGAR_GASTO')).toBe('El monto debe ser mayor a 0.');
    expect(TraducirError(ErrorApi('MONTO_MAXIMO'), 'EDITAR')).toBe('El monto máximo es 999.999.999.999,99.');
  });

  it('traduce MOVIMIENTO_INEXISTENTE en edición y eliminación', () => {
    const texto = 'El movimiento ya no existe. La lista se actualizará.';
    expect(TraducirError(ErrorApi('MOVIMIENTO_INEXISTENTE'), 'EDITAR')).toBe(texto);
    expect(TraducirError(ErrorApi('MOVIMIENTO_INEXISTENTE'), 'ELIMINAR')).toBe(texto);
  });

  it.each([
    ['AGREGAR_GASTO', 'No se pudo registrar el gasto. Vuelva a intentarlo.'],
    ['AGREGAR_INGRESO', 'No se pudo registrar el ingreso. Vuelva a intentarlo.'],
    ['EDITAR', 'No se pudo actualizar el movimiento. Vuelva a intentarlo.'],
    ['ELIMINAR', 'No se pudo eliminar el movimiento. Vuelva a intentarlo.'],
    ['CARGAR_MOVIMIENTOS', 'No se pudieron cargar los movimientos. Vuelva a intentarlo.'],
    ['CARGAR_CATEGORIAS', 'No se pudieron cargar las categorías. Vuelva a intentarlo.'],
  ])('para %s usa el texto genérico de la operación', (operacion, texto) => {
    for (const codigo of ['MONTO_DECIMALES', 'TIPO_INVALIDO', 'CATEGORIA_INVALIDA', 'FECHA_INVALIDA', 'SIN_CUENTA', 'FALLA_SIMULADA']) {
      expect(TraducirError(ErrorApi(codigo), operacion)).toBe(texto);
    }
    expect(TraducirError(new TypeError('Failed to fetch'), operacion)).toBe(texto);
    expect(TraducirError(ErrorApi('relation "bat_x" does not exist'), operacion)).toBe(texto);
    expect(TraducirError(undefined, operacion)).toBe(texto);
  });

  it('nunca devuelve el mensaje técnico', () => {
    const tecnico = 'duplicate key value violates unique constraint "bapk_movimientos"';
    expect(TraducirError(ErrorApi(tecnico), 'AGREGAR_GASTO')).not.toContain('duplicate');
  });
});

describe('EsMovimientoInexistente', () => {
  it('reconoce el código', () => {
    expect(EsMovimientoInexistente(ErrorApi('MOVIMIENTO_INEXISTENTE'))).toBe(true);
    expect(EsMovimientoInexistente(ErrorApi('FALLA_SIMULADA'))).toBe(false);
    expect(EsMovimientoInexistente(null)).toBe(false);
  });
});
