import { describe, expect, it } from 'vitest';
import { addDays } from '../../shared/calendar.ts';
import type { DemoCalendar } from './demo-sales.calendar.ts';
import { checkDemoCalendar } from './demo-sales.rules.ts';

const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

// Calendario armado a mano: 40 ventas de lunes a jueves, 60 viernes y sábados, 40 los domingos
// y sin ventas en los domingos de `closed`.
function calendarOf(
  from: string,
  to: string,
  closed: string[],
  count: (date: string) => number = (date) => ([5, 6].includes(weekday(date)) ? 60 : 40),
): DemoCalendar {
  const days = [];
  for (let date = from; date <= to; date = addDays(date, 1))
    days.push({ date, salesCount: closed.includes(date) ? 0 : count(date) });
  return { from, to, days, total: days.reduce((sum, day) => sum + day.salesCount, 0) };
}

// 28/07/2026–27/10/2026: agosto y septiembre son los meses completos.
const from = '2026-07-28';
const to = '2026-10-27';
const valid = () => calendarOf(from, to, ['2026-08-09', '2026-09-13', '2026-10-11']);

describe('checkDemoCalendar (RF-4, RNF-4)', () => {
  it('no encuentra fallos en un calendario que cumple todo', () => {
    expect(checkDemoCalendar(valid())).toEqual([]);
  });

  it('detecta un día que falta o que sobra en el período', () => {
    const missing = valid();
    missing.days.splice(10, 1);
    missing.total = missing.days.reduce((sum, day) => sum + day.salesCount, 0);
    expect(checkDemoCalendar(missing)).toContain('period');
    const extra = valid();
    extra.days.push({ date: '2026-10-28', salesCount: 40 });
    extra.total += 40;
    expect(checkDemoCalendar(extra)).toContain('period');
  });

  it('detecta menos de 2 o más de 4 domingos sin ventas', () => {
    expect(checkDemoCalendar(calendarOf(from, to, ['2026-08-09']))).toContain('closed-sundays');
    expect(
      checkDemoCalendar(
        calendarOf(from, to, [
          '2026-08-02',
          '2026-08-16',
          '2026-09-06',
          '2026-09-20',
          '2026-10-04',
        ]),
      ),
    ).toContain('closed-sundays');
  });

  it('detecta un día sin ventas que no es domingo', () => {
    expect(
      checkDemoCalendar(calendarOf(from, to, ['2026-08-09', '2026-09-13', '2026-10-14'])),
    ).toContain('daily-range');
  });

  it('detecta un mes completo sin domingo cerrado', () => {
    expect(checkDemoCalendar(calendarOf(from, to, ['2026-08-09', '2026-10-11']))).toContain(
      'closed-sunday-per-month',
    );
  });

  it('detecta dos domingos sin ventas seguidos', () => {
    expect(checkDemoCalendar(calendarOf(from, to, ['2026-08-30', '2026-09-06']))).toContain(
      'consecutive-closed-sundays',
    );
  });

  it('detecta un día con menos de 30 o más de 80 ventas', () => {
    const closed = ['2026-08-09', '2026-09-13'];
    expect(
      checkDemoCalendar(calendarOf(from, to, closed, (date) => (date === '2026-09-01' ? 29 : 50))),
    ).toContain('daily-range');
    expect(
      checkDemoCalendar(
        calendarOf(from, to, closed, (date) =>
          date === '2026-09-04' ? 81 : [5, 6].includes(weekday(date)) ? 60 : 40,
        ),
      ),
    ).toContain('daily-range');
  });

  it('detecta viernes y sábados con menos de un 20 % más que de lunes a jueves', () => {
    expect(
      checkDemoCalendar(
        calendarOf(from, to, ['2026-08-09', '2026-09-13'], (date) =>
          [5, 6].includes(weekday(date)) ? 47 : 40,
        ),
      ),
    ).toContain('weekend-boost');
  });

  it('detecta un total que no es la suma de los días', () => {
    const wrong = valid();
    wrong.total += 1;
    expect(checkDemoCalendar(wrong)).toContain('total');
  });
});
