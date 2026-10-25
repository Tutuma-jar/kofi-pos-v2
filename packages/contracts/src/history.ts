import { z } from 'zod';
import type { Role } from './auth.ts';
import {
  boliviaDateSchema,
  boliviaMonthSchema,
  byPaymentMethodSchema,
  dayTotalSchema,
} from './dashboard.ts';
import { saleSchema } from './sales.ts';

// Contrato del módulo Historial (SPEC-005 plan §6). Las cifras, los días y los meses los calcula la
// API (principio 3), también el día o el mes anterior y siguiente (D-4); la interfaz los muestra con
// formatPrice, formatDate, formatMonth, formatDateTime, formatTime y formatRole.

// Roles que pueden usar el Historial (RF-1, D-6). Provisional mientras no se aclare la duda 1 de
// spec.md. La API rechaza a los demás con 403 y la interfaz no les muestra sus rutas.
export const HISTORY_ROLES = ['owner'] as const satisfies readonly Role[];

export const HISTORY_MESSAGES = {
  forbidden: 'No tienes permiso para ver el historial de ventas',
  invalidDate: 'La fecha no es válida',
  futureDate: 'No se pueden consultar fechas futuras',
  invalidMonth: 'El mes no es válido',
  futureMonth: 'No se pueden consultar meses futuros',
  invalidSaleNumber: 'Escribe un número de venta válido',
  emptyDay: 'No hay ventas registradas este día',
  emptyMonth: 'No hay ventas registradas este mes',
} as const;

// «No existe la venta N.º 7» (RF-9), con el número ya normalizado por parseSaleNumber.
export function saleNotFoundMessage(number: string): string {
  return `No existe la venta N.º ${number}`;
}

// El mayor número de venta posible: sales.number es integer en PostgreSQL (D-8).
export const SALE_NUMBER_MAX = 2147483647;

// Un número de venta escrito por la persona (RF-9, D-8): sin espacios alrededor ni ceros a la
// izquierda, como texto para no perder cifras. null si no es un entero mayor que cero.
export function parseSaleNumber(text: string): string | null {
  const digits = text.trim();
  if (!/^\d+$/.test(digits)) return null;
  const number = digits.replace(/^0+/, '');
  return number === '' ? null : number;
}

const centsSchema = z.int().min(0);
const countSchema = z.int().min(0);

// Una fila de la lista de un día (RF-3, D-12): la venta tal como se registró, sin sus líneas.
export const listedSaleSchema = saleSchema.omit({ lines: true }).strict();
export type ListedSale = z.infer<typeof listedSaleSchema>;

const totalsShape = {
  // Momento de los datos (RF-5).
  asOf: z.iso.datetime({ offset: true }),
  totalCents: centsSchema,
  salesCount: countSchema,
  byPaymentMethod: byPaymentMethodSchema,
};

// GET /api/history/day (US1; RF-2 a RF-5). `nextDate` es null si y solo si el día es hoy.
export const dayHistorySchema = z
  .object({
    date: boliviaDateSchema,
    today: boliviaDateSchema,
    previousDate: boliviaDateSchema,
    nextDate: boliviaDateSchema.nullable(),
    ...totalsShape,
    sales: z.array(listedSaleSchema),
  })
  .refine((day) => day.salesCount === day.sales.length, {
    error: 'El número de ventas es el de la lista',
    path: ['salesCount'],
  })
  .refine((day) => day.date <= day.today, {
    error: 'El día no puede ser posterior a hoy',
    path: ['date'],
  })
  .refine((day) => (day.nextDate === null) === (day.date === day.today), {
    error: 'El día siguiente es null si y solo si el día es hoy',
    path: ['nextDate'],
  });
export type DayHistory = z.infer<typeof dayHistorySchema>;

// GET /api/history/month (US3; RF-11 a RF-13). `nextMonth` es null si y solo si es el mes en curso.
export const monthHistorySchema = z
  .object({
    month: boliviaMonthSchema,
    currentMonth: boliviaMonthSchema,
    previousMonth: boliviaMonthSchema,
    nextMonth: boliviaMonthSchema.nullable(),
    ...totalsShape,
    days: z.array(dayTotalSchema).min(1).max(31),
  })
  .refine((month) => month.month <= month.currentMonth, {
    error: 'El mes no puede ser posterior al mes en curso',
    path: ['month'],
  })
  .refine((month) => (month.nextMonth === null) === (month.month === month.currentMonth), {
    error: 'El mes siguiente es null si y solo si es el mes en curso',
    path: ['nextMonth'],
  });
export type MonthHistory = z.infer<typeof monthHistorySchema>;

// GET /api/history/sales/:number (US2; RF-8, RF-9): la venta tal como se registró y su día en
// Bolivia, para «Volver» (D-4).
export const historySaleResponseSchema = z.object({ sale: saleSchema, date: boliviaDateSchema });
export type HistorySaleResponse = z.infer<typeof historySaleResponseSchema>;

// Parámetros de consulta: la fecha y el mes llegan como texto y los valida el servicio, con los
// mensajes propios del Historial (D-10).
export const historyDayQuerySchema = z.object({ date: z.string().optional() });
export const historyMonthQuerySchema = z.object({ month: z.string().optional() });
