// Navegación de fechas del cliente simulado del historial (plan D-9): el día y el mes anterior y
// siguiente y los días de un mes, para moverse por días en desarrollo. En producción lo calcula la
// API (D-4); este archivo no llega al build.

const isoDate = (year: number, monthIndex: number, day: number) =>
  new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 'YYYY-MM-DD'.length);

export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return isoDate(year!, month! - 1, day! + days);
}

export function shiftMonth(month: string, months: number): string {
  const [year, number] = month.split('-').map(Number);
  return isoDate(year!, number! - 1 + months, 1).slice(0, 'YYYY-MM'.length);
}

export function monthDays(month: string): string[] {
  const last = Number(shiftDate(`${shiftMonth(month, 1)}-01`, -1).slice('YYYY-MM-'.length));
  return Array.from(
    { length: last },
    (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
  );
}
