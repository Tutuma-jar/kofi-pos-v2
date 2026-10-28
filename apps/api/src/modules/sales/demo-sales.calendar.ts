import { addDays, addMonths, boliviaDate, daysOfMonth } from '../../shared/calendar.ts';
import { createRandom, type Random } from './demo-sales.random.ts';
import { checkDemoCalendar, DemoSalesGenerationError } from './demo-sales.rules.ts';

// Período y ventas por día de la demostración (SPEC-007, RF-1, RF-4; plan §5.1, §5.2).

export interface DemoPeriod {
  from: string; // YYYY-MM-DD, hora de Bolivia
  to: string; // ayer
}

export interface DemoCalendar extends DemoPeriod {
  days: { date: string; salesCount: number }[]; // 0 en los domingos sin ventas
  total: number; // [n] de RF-3
}

const MAX_ATTEMPTS = 50;

// Día de la semana de una fecha YYYY-MM-DD: 0 domingo … 6 sábado.
export const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

// Meses cuyos días están todos dentro del período.
export function completeMonths({ from, to }: DemoPeriod): string[] {
  const months: string[] = [];
  for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = addMonths(month, 1)) {
    const days = daysOfMonth(month);
    if (days[0]! >= from && days.at(-1)! <= to) months.push(month);
  }
  return months;
}

// Del mismo día, tres meses antes de hoy, hasta ayer; si ese día no existe, el último del mes.
export function demoPeriod(now: Date): DemoPeriod {
  const today = boliviaDate(now);
  const month = addMonths(today.slice(0, 7), -3);
  const days = daysOfMonth(month);
  return { from: days[Math.min(Number(today.slice(8)), days.length) - 1]!, to: addDays(today, -1) };
}

// Domingos sin ventas: uno en cada mes completo y, al azar, hasta un total de 2 a 4, nunca dos
// seguidos.
function closedSundays(period: DemoPeriod, random: Random): Set<string> {
  const sundays = datesBetween(period.from, period.to).filter((date) => weekday(date) === 0);
  const closed = new Set<string>();
  const free = (date: string) =>
    !closed.has(date) && !closed.has(addDays(date, -7)) && !closed.has(addDays(date, 7));
  for (const month of completeMonths(period)) {
    const candidates = sundays.filter((date) => date.startsWith(month) && free(date));
    if (candidates.length > 0) closed.add(random.pick(candidates));
  }
  const target = random.int(Math.max(2, closed.size), 4);
  while (closed.size < target) {
    const candidates = sundays.filter(free);
    if (candidates.length === 0) break;
    closed.add(random.pick(candidates));
  }
  return closed;
}

export function planDemoCalendar(period: DemoPeriod, seed: number): DemoCalendar {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const random = createRandom(seed, 'calendar', attempt);
    const closed = closedSundays(period, random);
    const days = datesBetween(period.from, period.to).map((date) => ({
      date,
      salesCount: closed.has(date)
        ? 0
        : [5, 6].includes(weekday(date))
          ? random.int(50, 80)
          : random.int(30, 62),
    }));
    const calendar = { ...period, days, total: days.reduce((sum, day) => sum + day.salesCount, 0) };
    if (checkDemoCalendar(calendar).length === 0) return calendar;
  }
  throw new DemoSalesGenerationError();
}
