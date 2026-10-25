import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOLIVIA_TIME_ZONE, formatDate, formatDateTime, formatMonth, formatTime } from './index.ts';

describe('formatDateTime (plan §5.6, D-7)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa la hora de Bolivia', () => {
    expect(BOLIVIA_TIME_ZONE).toBe('America/La_Paz');
  });

  it.each([
    ['2026-10-24T18:05:12.000Z', '24/10/2026 14:05'],
    ['2027-01-05T13:30:00.000Z', '05/01/2027 09:30'],
    // Ya es 25 en UTC, pero todavía 24 en Bolivia.
    ['2026-10-25T03:59:00.000Z', '24/10/2026 23:59'],
    ['2026-10-24T04:00:00.000Z', '24/10/2026 00:00'],
    ['2026-10-24T14:05:12-04:00', '24/10/2026 14:05'],
  ])('muestra %s como «%s»', (iso, expected) => {
    expect(formatDateTime(iso)).toBe(expected);
  });

  it.each(['Asia/Tokyo', 'UTC', 'America/New_York'])(
    'da lo mismo con la zona horaria %s en el proceso',
    (timeZone) => {
      vi.stubEnv('TZ', timeZone);
      expect(formatDateTime('2026-10-25T03:59:00.000Z')).toBe('24/10/2026 23:59');
    },
  );
});

// Fechas sin hora y meses ya calculados en Bolivia por la API (SPEC-004 D-5): solo se reordena el
// texto, sin zona horaria.
describe('formatDate y formatMonth (SPEC-004 D-5)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['2026-10-24', '24/10/2026'],
    ['2027-01-05', '05/01/2027'],
    ['2028-02-29', '29/02/2028'],
  ])('muestra la fecha %s como «%s»', (date, expected) => {
    expect(formatDate(date)).toBe(expected);
  });

  it.each([
    ['2026-10', 'Octubre de 2026'],
    ['2027-01', 'Enero de 2027'],
    ['2026-12', 'Diciembre de 2026'],
    ['2026-09', 'Septiembre de 2026'],
  ])('muestra el mes %s como «%s»', (month, expected) => {
    expect(formatMonth(month)).toBe(expected);
  });

  it.each(['Pacific/Kiritimati', 'UTC', 'Pacific/Pago_Pago'])(
    'da lo mismo con la zona horaria %s en el proceso',
    (timeZone) => {
      vi.stubEnv('TZ', timeZone);
      expect(formatDate('2026-10-01')).toBe('01/10/2026');
      expect(formatMonth('2026-10')).toBe('Octubre de 2026');
    },
  );
});

// Hora sin fecha, en hora de Bolivia (SPEC-005 D-5).
describe('formatTime (SPEC-005 D-5)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['2026-10-24T14:30:00.000Z', '10:30'],
    ['2026-10-25T03:59:00.000Z', '23:59'],
    ['2026-10-25T04:00:00.000Z', '00:00'],
    ['2026-10-24T09:05:00-04:00', '09:05'],
  ])('muestra %s como «%s»', (iso, expected) => {
    expect(formatTime(iso)).toBe(expected);
  });

  it.each(['Asia/Tokyo', 'UTC', 'America/New_York'])(
    'da lo mismo con la zona horaria %s en el proceso',
    (timeZone) => {
      vi.stubEnv('TZ', timeZone);
      expect(formatTime('2026-10-25T03:59:00.000Z')).toBe('23:59');
    },
  );
});
