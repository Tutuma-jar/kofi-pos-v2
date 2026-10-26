import { BOLIVIA_TIME_ZONE } from '@kofi/contracts';

// Días y meses en hora de Bolivia (docs/architecture.md §6.8; SPEC-004 plan §5.1, D-4). Los calcula
// la API a partir de clock.ts, nunca la interfaz con la hora de la computadora. Mientras no se
// aclare si la jornada de Kofi pasa de la medianoche, el día es el día calendario (D-10).

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOLIVIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const offsetFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: BOLIVIA_TIME_ZONE,
  timeZoneName: 'longOffset',
});

// 'YYYY-MM-DD' del instante en Bolivia.
export function boliviaDate(instant: Date): string {
  const parts = Object.fromEntries(
    dateFormat.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return `${parts.year!.padStart(4, '0')}-${parts.month}-${parts.day}`;
}

// Instante de las 00:00 de esa fecha en Bolivia. El desfase sale de Intl («GMT-04:00») y no se
// escribe fijo, para no depender de que Bolivia nunca cambie de hora.
export function startOfBoliviaDay(date: string): Date {
  const zoneName = offsetFormat
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')!.value;
  const offset = zoneName.slice('GMT'.length);
  const [hours = 0, minutes = 0, seconds = 0] = offset.slice(1).split(':').map(Number);
  const offsetSeconds = (hours * 3600 + minutes * 60 + seconds) * (offset.startsWith('-') ? -1 : 1);
  // Los desfases históricos pueden incluir segundos, que Date no acepta en un sufijo ISO.
  return new Date(new Date(`${date}T00:00:00Z`).getTime() - offsetSeconds * 1000);
}

export interface BoliviaDayRange {
  date: string;
  from: Date;
  // Excluido, como en listRegisteredSales: now + 1 ms incluye hasta el momento de la consulta.
  to: Date;
}

export interface BoliviaMonthRange {
  month: string;
  // Del día 1 a hoy.
  days: string[];
  from: Date;
  to: Date;
}

const justAfter = (now: Date) => new Date(now.getTime() + 1);

// Hoy, desde las 00:00 de Bolivia hasta el momento de la consulta (RF-2, RF-6).
export function boliviaDayRange(now: Date): BoliviaDayRange {
  const date = boliviaDate(now);
  return { date, from: startOfBoliviaDay(date), to: justAfter(now) };
}

// El mes en curso, desde las 00:00 del día 1 hasta el momento de la consulta (RF-9, RF-10).
export function boliviaMonthRange(now: Date): BoliviaMonthRange {
  const date = boliviaDate(now);
  const month = date.slice(0, 'YYYY-MM'.length);
  const today = Number(date.slice('YYYY-MM-'.length));
  const days = Array.from(
    { length: today },
    (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
  );
  return { month, days, from: startOfBoliviaDay(days[0]!), to: justAfter(now) };
}

// Días y meses cualesquiera, para el Historial (SPEC-005 plan §5.1, D-4). Las fechas se suman como
// fechas de calendario, sin zona horaria, conservando también los años anteriores a 0100.

const isoDate = (instant: Date) => instant.toISOString().slice(0, 'YYYY-MM-DD'.length);

function calendarDate(year: number, monthIndex: number, day: number): Date {
  const instant = new Date(0);
  instant.setUTCFullYear(year, monthIndex, day);
  return instant;
}

// 'YYYY-MM-DD' ± n días.
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return isoDate(calendarDate(year!, month! - 1, day! + days));
}

// 'YYYY-MM' ± n meses.
export function addMonths(month: string, months: number): string {
  const [year, number] = month.split('-').map(Number);
  return isoDate(calendarDate(year!, number! - 1 + months, 1)).slice(0, 'YYYY-MM'.length);
}

// Todas las fechas del mes, del día 1 al último.
export function daysOfMonth(month: string): string[] {
  const last = addDays(`${addMonths(month, 1)}-01`, -1);
  const length = Number(last.slice('YYYY-MM-'.length));
  return Array.from({ length }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

const earliest = (a: Date, b: Date) => (a.getTime() <= b.getTime() ? a : b);

// Un día hasta hoy: de sus 00:00 a las 00:00 del día siguiente, o hasta el momento de la consulta si
// es hoy (RF-2, RF-3). `to` excluido, como en listRegisteredSales.
export function boliviaDayBounds(date: string, now: Date): { from: Date; to: Date } {
  return {
    from: startOfBoliviaDay(date),
    to: earliest(startOfBoliviaDay(addDays(date, 1)), justAfter(now)),
  };
}

// Un mes hasta el mes en curso: todos sus días, o del 1 a hoy si es el mes en curso (RF-12, RF-13).
export function boliviaMonthBounds(
  month: string,
  now: Date,
): { days: string[]; from: Date; to: Date } {
  const today = boliviaDate(now);
  return {
    days: daysOfMonth(month).filter((date) => date <= today),
    from: startOfBoliviaDay(`${month}-01`),
    to: earliest(startOfBoliviaDay(`${addMonths(month, 1)}-01`), justAfter(now)),
  };
}
