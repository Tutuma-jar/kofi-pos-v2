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
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Instante de las 00:00 de esa fecha en Bolivia. El desfase sale de Intl («GMT-04:00») y no se
// escribe fijo, para no depender de que Bolivia nunca cambie de hora.
export function startOfBoliviaDay(date: string): Date {
  const zoneName = offsetFormat
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')!.value;
  const offset = zoneName.slice('GMT'.length) || '+00:00';
  return new Date(`${date}T00:00:00${offset}`);
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
