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
  const parts = Object.fromEntries(
    dateTimeFormat.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}
