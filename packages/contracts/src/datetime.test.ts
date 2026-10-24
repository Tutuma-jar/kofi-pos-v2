import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOLIVIA_TIME_ZONE, formatDateTime } from './index.ts';

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
