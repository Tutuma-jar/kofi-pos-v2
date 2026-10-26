import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addDays,
  addMonths,
  boliviaDate,
  boliviaDayBounds,
  boliviaDayRange,
  boliviaMonthBounds,
  boliviaMonthRange,
  daysOfMonth,
  startOfBoliviaDay,
} from './calendar.ts';

// Días y meses de Bolivia (SPEC-004 plan §5.1, D-4). Bolivia está en UTC−4: las 00:00 de Bolivia son
// las 04:00 UTC.

const ZONES = ['UTC', 'Asia/Tokyo', 'America/New_York', 'Pacific/Kiritimati'];

describe('años anteriores a 0100 (SPEC-005 T030)', () => {
  it.each(ZONES)('conserva años, bisiestos y rangos en %s', (zone) => {
    vi.stubEnv('TZ', zone);
    expect(addDays('0001-01-02', -1)).toBe('0001-01-01');
    expect(addDays('0099-12-31', 1)).toBe('0100-01-01');
    expect(addDays('0100-01-01', -1)).toBe('0099-12-31');
    expect(addMonths('0099-12', 1)).toBe('0100-01');
    expect(addMonths('0100-01', -1)).toBe('0099-12');
    expect(daysOfMonth('0012-02')).toHaveLength(29);
    expect(daysOfMonth('0100-02')).toHaveLength(28);
    expect(boliviaDate(new Date('0001-01-01T12:00:00Z'))).toBe('0001-01-01');
    expect(boliviaDayBounds('0099-12-31', new Date('2026-10-25T15:00:00Z'))).toEqual({
      from: new Date('0099-12-31T04:32:36Z'),
      to: new Date('0100-01-01T04:32:36Z'),
    });
    expect(boliviaMonthBounds('0099-12', new Date('2026-10-25T15:00:00Z')).to).toEqual(
      new Date('0100-01-01T04:32:36Z'),
    );
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('boliviaDate', () => {
  it.each([
    ['2026-10-25T03:59:59.999Z', '2026-10-24'],
    ['2026-10-25T04:00:00.000Z', '2026-10-25'],
    ['2026-11-01T03:59:00.000Z', '2026-10-31'],
    ['2026-11-01T04:00:00.000Z', '2026-11-01'],
  ])('%s es el %s en Bolivia', (instant, expected) => {
    expect(boliviaDate(new Date(instant))).toBe(expected);
  });

  it.each(ZONES)('da lo mismo con la zona horaria %s en el proceso', (timeZone) => {
    vi.stubEnv('TZ', timeZone);
    expect(boliviaDate(new Date('2026-10-25T03:59:59.999Z'))).toBe('2026-10-24');
  });
});

describe('startOfBoliviaDay', () => {
  it('son las 00:00 de Bolivia', () => {
    expect(startOfBoliviaDay('2026-10-24').toISOString()).toBe('2026-10-24T04:00:00.000Z');
    expect(startOfBoliviaDay('2028-02-29').toISOString()).toBe('2028-02-29T04:00:00.000Z');
  });
});

describe('boliviaDayRange', () => {
  it('va de las 00:00 de Bolivia hasta el momento de la consulta, incluido', () => {
    const now = new Date('2026-10-24T15:00:00.000Z');
    expect(boliviaDayRange(now)).toEqual({
      date: '2026-10-24',
      from: new Date('2026-10-24T04:00:00.000Z'),
      to: new Date('2026-10-24T15:00:00.001Z'),
    });
  });

  it('a las 23:59 de Bolivia sigue siendo el mismo día, aunque en UTC ya sea el siguiente', () => {
    const range = boliviaDayRange(new Date('2026-10-25T03:59:00.000Z'));
    expect(range.date).toBe('2026-10-24');
    expect(range.from.toISOString()).toBe('2026-10-24T04:00:00.000Z');
  });

  it('a las 00:00 de Bolivia empieza el día nuevo', () => {
    const range = boliviaDayRange(new Date('2026-10-25T04:00:00.000Z'));
    expect(range).toMatchObject({ date: '2026-10-25', from: new Date('2026-10-25T04:00:00.000Z') });
  });

  it.each(ZONES)('da lo mismo con la zona horaria %s en el proceso', (timeZone) => {
    vi.stubEnv('TZ', timeZone);
    const range = boliviaDayRange(new Date('2026-10-24T15:00:00.000Z'));
    expect(range.from.toISOString()).toBe('2026-10-24T04:00:00.000Z');
  });
});

describe('boliviaMonthRange', () => {
  it('va del día 1 a las 00:00 de Bolivia hasta el momento de la consulta, con los días del 1 a hoy', () => {
    const now = new Date('2026-10-24T15:00:00.000Z');
    const range = boliviaMonthRange(now);
    expect(range.month).toBe('2026-10');
    expect(range.from).toEqual(new Date('2026-10-01T04:00:00.000Z'));
    expect(range.to).toEqual(new Date('2026-10-24T15:00:00.001Z'));
    expect(range.days).toHaveLength(24);
    expect(range.days[0]).toBe('2026-10-01');
    expect(range.days.at(-1)).toBe('2026-10-24');
  });

  it('el día 1 tiene un solo día', () => {
    const range = boliviaMonthRange(new Date('2026-11-01T04:00:00.000Z'));
    expect(range).toMatchObject({ month: '2026-11', days: ['2026-11-01'] });
  });

  it('el 31/10 a las 23:59 de Bolivia sigue en octubre', () => {
    const range = boliviaMonthRange(new Date('2026-11-01T03:59:00.000Z'));
    expect(range.month).toBe('2026-10');
    expect(range.days).toHaveLength(31);
    expect(range.days.at(-1)).toBe('2026-10-31');
  });

  it('febrero de 2028 llega al 29', () => {
    const range = boliviaMonthRange(new Date('2028-02-29T20:00:00.000Z'));
    expect(range.days).toHaveLength(29);
    expect(range.days.at(-1)).toBe('2028-02-29');
  });

  it.each(ZONES)('da lo mismo con la zona horaria %s en el proceso', (timeZone) => {
    vi.stubEnv('TZ', timeZone);
    const range = boliviaMonthRange(new Date('2026-11-01T03:59:00.000Z'));
    expect(range.month).toBe('2026-10');
    expect(range.from.toISOString()).toBe('2026-10-01T04:00:00.000Z');
  });
});

// Días y meses cualesquiera, para el Historial (SPEC-005 plan §5.1, D-4).

describe('addDays', () => {
  it.each([
    ['2026-10-24', 1, '2026-10-25'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2026-02-28', 1, '2026-03-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2027-01-01', -1, '2026-12-31'],
  ])('%s con %i días es el %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });

  it.each(ZONES)('da lo mismo con la zona horaria %s en el proceso', (timeZone) => {
    vi.stubEnv('TZ', timeZone);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('addMonths', () => {
  it.each([
    ['2026-10', 1, '2026-11'],
    ['2026-12', 1, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-10', -1, '2026-09'],
  ])('%s con %i meses es %s', (month, months, expected) => {
    expect(addMonths(month, months)).toBe(expected);
  });
});

describe('daysOfMonth', () => {
  it.each([
    ['2026-10', 31],
    ['2026-09', 30],
    ['2028-02', 29],
    ['2026-02', 28],
  ])('%s tiene %i días, del 1 al último', (month, length) => {
    const days = daysOfMonth(month);
    expect(days).toHaveLength(length);
    expect(days[0]).toBe(`${month}-01`);
    expect(days.at(-1)).toBe(`${month}-${length}`);
  });

  it.each(ZONES)('da lo mismo con la zona horaria %s en el proceso', (timeZone) => {
    vi.stubEnv('TZ', timeZone);
    expect(daysOfMonth('2028-02')).toHaveLength(29);
  });
});

describe('boliviaDayBounds', () => {
  const now = new Date('2026-10-25T15:00:00.000Z');

  it('un día pasado va de sus 00:00 a las 00:00 del día siguiente, en Bolivia', () => {
    expect(boliviaDayBounds('2026-10-24', now)).toEqual({
      from: new Date('2026-10-24T04:00:00.000Z'),
      to: new Date('2026-10-25T04:00:00.000Z'),
    });
  });

  it('hoy termina en el momento de la consulta, incluido', () => {
    expect(boliviaDayBounds('2026-10-25', now)).toEqual({
      from: new Date('2026-10-25T04:00:00.000Z'),
      to: new Date('2026-10-25T15:00:00.001Z'),
    });
  });

  it.each(ZONES)('da lo mismo con la zona horaria %s en el proceso', (timeZone) => {
    vi.stubEnv('TZ', timeZone);
    expect(boliviaDayBounds('2026-10-24', now).to).toEqual(new Date('2026-10-25T04:00:00.000Z'));
  });
});

describe('boliviaMonthBounds', () => {
  const now = new Date('2026-10-25T15:00:00.000Z');

  it('un mes pasado tiene todos sus días y termina a las 00:00 del día 1 siguiente', () => {
    const bounds = boliviaMonthBounds('2026-09', now);
    expect(bounds.days).toHaveLength(30);
    expect(bounds.days[0]).toBe('2026-09-01');
    expect(bounds.days.at(-1)).toBe('2026-09-30');
    expect(bounds.from).toEqual(new Date('2026-09-01T04:00:00.000Z'));
    expect(bounds.to).toEqual(new Date('2026-10-01T04:00:00.000Z'));
  });

  it('el mes en curso va del día 1 a hoy y termina en el momento de la consulta', () => {
    const bounds = boliviaMonthBounds('2026-10', now);
    expect(bounds.days).toHaveLength(25);
    expect(bounds.days.at(-1)).toBe('2026-10-25');
    expect(bounds.from).toEqual(new Date('2026-10-01T04:00:00.000Z'));
    expect(bounds.to).toEqual(new Date('2026-10-25T15:00:00.001Z'));
  });

  it('diciembre termina a las 00:00 del 1 de enero en Bolivia', () => {
    expect(boliviaMonthBounds('2025-12', now).to).toEqual(new Date('2026-01-01T04:00:00.000Z'));
  });

  it('febrero de 2028 tiene 29 días', () => {
    expect(boliviaMonthBounds('2028-02', new Date('2028-03-10T12:00:00.000Z')).days).toHaveLength(
      29,
    );
  });

  it.each(ZONES)('da lo mismo con la zona horaria %s en el proceso', (timeZone) => {
    vi.stubEnv('TZ', timeZone);
    expect(boliviaMonthBounds('2026-10', now).days).toHaveLength(25);
  });
});
