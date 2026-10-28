import { addDays } from '../../shared/calendar.ts';
import { completeMonths, datesBetween, weekday, type DemoCalendar } from './demo-sales.calendar.ts';

// Reglas de las ventas de demostración (SPEC-007, RF-4 a RF-8; plan D-6). Cada función devuelve
// las reglas incumplidas: el generador reintenta hasta que no quede ninguna.

// El generador agotó sus intentos sin cumplir las reglas (D-11).
export class DemoSalesGenerationError extends Error {
  constructor() {
    super('No se pudieron generar ventas de demostración que cumplan las reglas');
    this.name = 'DemoSalesGenerationError';
  }
}

export type DemoCalendarRule =
  | 'period' // cada día del período, en orden, y ninguno hoy ni después
  | 'closed-sundays' // de 2 a 4 domingos sin ventas
  | 'closed-sunday-per-month' // al menos uno en cada mes completo
  | 'consecutive-closed-sundays' // nunca dos seguidos
  | 'daily-range' // los demás días, de 30 a 80 ventas (RNF-4)
  | 'weekend-boost' // viernes y sábados, al menos un 20 % más que de lunes a jueves
  | 'total'; // el total es la suma de los días

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

export function checkDemoCalendar(calendar: DemoCalendar): DemoCalendarRule[] {
  const failed = new Set<DemoCalendarRule>();
  const expected = datesBetween(calendar.from, calendar.to);
  if (
    calendar.days.length !== expected.length ||
    calendar.days.some((day, index) => day.date !== expected[index])
  )
    failed.add('period');

  const closed = calendar.days.filter((day) => day.salesCount === 0).map((day) => day.date);
  const closedSundays = closed.filter((date) => weekday(date) === 0);
  if (closedSundays.length < 2 || closedSundays.length > 4) failed.add('closed-sundays');
  if (completeMonths(calendar).some((month) => !closedSundays.some((d) => d.startsWith(month))))
    failed.add('closed-sunday-per-month');
  if (closedSundays.some((date) => closedSundays.includes(addDays(date, 7))))
    failed.add('consecutive-closed-sundays');
  if (
    closed.length !== closedSundays.length ||
    calendar.days.some(
      (day) => day.salesCount !== 0 && (day.salesCount < 30 || day.salesCount > 80),
    )
  )
    failed.add('daily-range');

  const open = calendar.days.filter((day) => day.salesCount > 0);
  const weekend = open.filter((day) => [5, 6].includes(weekday(day.date)));
  const weekdays = open.filter((day) => [1, 2, 3, 4].includes(weekday(day.date)));
  if (
    weekend.length === 0 ||
    weekdays.length === 0 ||
    average(weekend.map((day) => day.salesCount)) <
      1.2 * average(weekdays.map((day) => day.salesCount))
  )
    failed.add('weekend-boost');

  if (calendar.total !== calendar.days.reduce((sum, day) => sum + day.salesCount, 0))
    failed.add('total');
  return [...failed];
}
