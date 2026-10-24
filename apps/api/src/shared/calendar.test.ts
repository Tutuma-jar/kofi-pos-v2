import { afterEach, describe, expect, it, vi } from 'vitest';
import { boliviaDate, boliviaDayRange, boliviaMonthRange, startOfBoliviaDay } from './calendar.ts';

// Días y meses de Bolivia (SPEC-004 plan §5.1, D-4). Bolivia está en UTC−4: las 00:00 de Bolivia son
// las 04:00 UTC.

const ZONES = ['UTC', 'Asia/Tokyo', 'America/New_York', 'Pacific/Kiritimati'];

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
