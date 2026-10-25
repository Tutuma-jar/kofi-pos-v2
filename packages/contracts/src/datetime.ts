// Fechas y horas (docs/architecture.md §6.8, SPEC-003 D-7). Viajan en el contrato como texto
// ISO 8601 y se muestran siempre en hora de Bolivia, sin importar la zona de la computadora.

export const BOLIVIA_TIME_ZONE = 'America/La_Paz';

const dateTimeFormat = new Intl.DateTimeFormat('es-BO', {
  timeZone: BOLIVIA_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// «24/10/2026 14:05». Se arma con formatToParts para no depender de los separadores de cada
// navegador (plan §5.6).
export function formatDateTime(iso: string): string {
  const parts = dateTimeParts(iso);
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function dateTimeParts(iso: string): Record<string, string> {
  return Object.fromEntries(
    dateTimeFormat.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
}

// «10:30»: solo la hora, en hora de Bolivia (SPEC-005 D-5).
export function formatTime(iso: string): string {
  const parts = dateTimeParts(iso);
  return `${parts.hour}:${parts.minute}`;
}

// Fechas sin hora (`YYYY-MM-DD`) y meses (`YYYY-MM`) que la API ya calculó en hora de Bolivia
// (SPEC-004 D-5): se muestran reordenando el texto, sin pasar por ninguna zona horaria.

// «24/10/2026».
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

// «Octubre de 2026».
export function formatMonth(month: string): string {
  const [year, number] = month.split('-');
  return `${MONTH_NAMES[Number(number) - 1]} de ${year}`;
}
