import { afterEach, describe, expect, it } from 'vitest';
import { addDays } from '../../shared/calendar.ts';
import { demoPeriod, planDemoCalendar, type DemoCalendar } from './demo-sales.calendar.ts';

// Día de la semana de una fecha YYYY-MM-DD: 0 domingo … 6 sábado.
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe('período de demostración (RF-1, «Conceptos»)', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it.each([
    ['2026-10-28T11:00:00-04:00', '2026-07-28', '2026-10-27'],
    ['2026-12-31T11:00:00-04:00', '2026-09-30', '2026-12-30'],
    ['2026-11-01T08:00:00-04:00', '2026-08-01', '2026-10-31'],
    ['2027-05-31T11:00:00-04:00', '2027-02-28', '2027-05-30'],
    ['2028-05-31T11:00:00-04:00', '2028-02-29', '2028-05-30'],
  ])('si ahora es %s, va del %s al %s', (now, from, to) => {
    expect(demoPeriod(new Date(now))).toEqual({ from, to });
  });

  it('decide el día en hora de Bolivia: las 23:30 del 27/10 siguen siendo el 27/10', () => {
    expect(demoPeriod(new Date('2026-10-27T23:30:00-04:00'))).toEqual({
      from: '2026-07-27',
      to: '2026-10-26',
    });
  });

  it('no cambia con otra zona horaria en el proceso', () => {
    const now = new Date('2026-10-28T21:30:00-04:00'); // 29/10 en Tokio
    const expected = demoPeriod(now);
    process.env.TZ = 'Asia/Tokyo';
    expect(demoPeriod(now)).toEqual(expected);
    process.env.TZ = 'America/Los_Angeles';
    expect(demoPeriod(now)).toEqual(expected);
  });
});

describe('calendario de las ventas de demostración (RF-4, RNF-4)', () => {
  const period = { from: '2026-07-28', to: '2026-10-27' };
  const seeds = Array.from({ length: 200 }, (_, index) => index + 1);
  const calendars: DemoCalendar[] = seeds.map((seed) => planDemoCalendar(period, seed));

  it('tiene cada día del período, en orden, y ninguno hoy ni después', () => {
    for (const calendar of calendars) {
      expect(calendar.from).toBe(period.from);
      expect(calendar.to).toBe(period.to);
      expect(calendar.days[0]!.date).toBe(period.from);
      expect(calendar.days.at(-1)!.date).toBe(period.to);
      calendar.days.forEach((day, index) => {
        if (index > 0) expect(day.date).toBe(addDays(calendar.days[index - 1]!.date, 1));
      });
      expect(calendar.days.every((day) => day.date < '2026-10-28')).toBe(true);
    }
  });

  it('deja sin ventas de 2 a 4 domingos, uno en agosto y otro en septiembre, nunca seguidos', () => {
    for (const calendar of calendars) {
      const closed = calendar.days.filter((day) => day.salesCount === 0).map((day) => day.date);
      expect(closed.length).toBeGreaterThanOrEqual(2);
      expect(closed.length).toBeLessThanOrEqual(4);
      expect(closed.every((date) => weekday(date) === 0)).toBe(true);
      expect(closed.some((date) => date.startsWith('2026-08'))).toBe(true);
      expect(closed.some((date) => date.startsWith('2026-09'))).toBe(true);
      for (let index = 1; index < closed.length; index++)
        expect(closed[index]).not.toBe(addDays(closed[index - 1]!, 7));
    }
  });

  it('da de 30 a 80 ventas a los demás días y viernes y sábados al menos un 20 % más', () => {
    for (const calendar of calendars) {
      const open = calendar.days.filter((day) => day.salesCount > 0);
      expect(open.every((day) => day.salesCount >= 30 && day.salesCount <= 80)).toBe(true);
      const weekend = open.filter((day) => [5, 6].includes(weekday(day.date)));
      const weekdays = open.filter((day) => [1, 2, 3, 4].includes(weekday(day.date)));
      expect(average(weekend.map((day) => day.salesCount))).toBeGreaterThanOrEqual(
        1.2 * average(weekdays.map((day) => day.salesCount)),
      );
      expect(calendar.total).toBe(open.reduce((sum, day) => sum + day.salesCount, 0));
    }
  });

  it('con un período de tres meses completos, deja un domingo sin ventas en cada uno', () => {
    const full = { from: '2026-08-01', to: '2026-10-31' };
    for (const seed of seeds.slice(0, 50)) {
      const closed = planDemoCalendar(full, seed)
        .days.filter((day) => day.salesCount === 0)
        .map((day) => day.date.slice(0, 7));
      expect(new Set(closed)).toEqual(new Set(['2026-08', '2026-09', '2026-10']));
    }
  });

  it('da el mismo calendario con la misma semilla, y otro con otra', () => {
    expect(planDemoCalendar(period, 7)).toEqual(planDemoCalendar(period, 7));
    expect(planDemoCalendar(period, 7)).not.toEqual(planDemoCalendar(period, 8));
  });
});
