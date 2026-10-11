import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ConvertirFechaLocalATexto,
  ConvertirTextoAFechaLocal,
  FormatearFecha,
  ObtenerFechaHoy,
} from '../../src/utilidades/fechas.js';

const zonaOriginal = process.env.TZ;

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = zonaOriginal;
});

describe('ObtenerFechaHoy', () => {
  it('a las 23:30 en UTC-3 sigue siendo el mismo día local, aunque en UTC ya sea mañana', () => {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T02:30:00Z'));
    expect(ObtenerFechaHoy()).toBe('2026-10-03');
  });

  it('completa mes y día con ceros', () => {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T15:00:00Z'));
    expect(ObtenerFechaHoy()).toBe('2026-01-05');
  });
});

describe('FormatearFecha', () => {
  it('"2026-09-17" → "17/09/2026"', () => {
    expect(FormatearFecha('2026-09-17')).toBe('17/09/2026');
  });
});

describe('conversión para el calendario', () => {
  it('ida y vuelta sin corrimiento de día en zonas al oeste y al este de UTC', () => {
    for (const zona of ['America/Argentina/Buenos_Aires', 'Pacific/Auckland', 'UTC']) {
      process.env.TZ = zona;
      const fecha = ConvertirTextoAFechaLocal('2026-09-17');
      expect(fecha.getFullYear()).toBe(2026);
      expect(fecha.getMonth()).toBe(8);
      expect(fecha.getDate()).toBe(17);
      expect(ConvertirFechaLocalATexto(fecha)).toBe('2026-09-17');
    }
  });
});
