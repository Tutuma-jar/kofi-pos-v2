import { z } from 'zod';
import type { Role } from './auth.ts';
import { paymentMethodSchema } from './sales.ts';

// Contrato del módulo Dashboard (plan §6). Todas las cifras las calcula la API (principio 3); la
// interfaz las muestra con formatPrice, formatDate, formatMonth y formatDateTime.

// Roles que pueden ver el resumen del mes (RF-9, D-6); el de hoy lo ven el dueño y el cajero. La API
// rechaza a los demás con 403 y la interfaz no les pide el mes, con esta misma lista.
export const DASHBOARD_MONTH_ROLES = ['owner'] as const satisfies readonly Role[];

export const DASHBOARD_MESSAGES = {
  forbiddenMonth: 'No tienes permiso para ver el resumen del mes',
  emptyToday: 'Todavía no hay ventas hoy',
  emptyMonth: 'Todavía no hay ventas este mes',
} as const;

// Productos más vendidos de cada resumen (RF-5).
export const DASHBOARD_TOP_PRODUCTS = 5;

// Fechas y meses ya en hora de Bolivia (docs/architecture.md §6.8).
export const boliviaDateSchema = z.iso.date();
export const boliviaMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const centsSchema = z.int().min(0);
const countSchema = z.int().min(0);

export const paymentMethodTotalSchema = z.object({
  paymentMethod: paymentMethodSchema,
  totalCents: centsSchema,
  salesCount: countSchema,
});
export type PaymentMethodTotal = z.infer<typeof paymentMethodTotalSchema>;

export const topProductSchema = z.object({
  productId: z.uuid(),
  productName: z.string(),
  quantity: z.int().min(1),
  totalCents: z.int().min(1),
});
export type TopProduct = z.infer<typeof topProductSchema>;

// Siempre efectivo y QR, en ese orden (RF-4).
const byPaymentMethodSchema = z.tuple([
  paymentMethodTotalSchema.extend({ paymentMethod: z.literal('cash') }),
  paymentMethodTotalSchema.extend({ paymentMethod: z.literal('qr') }),
]);

const periodSummaryShape = {
  // Momento de los datos (RF-6).
  asOf: z.iso.datetime({ offset: true }),
  totalCents: centsSchema,
  salesCount: countSchema,
  // null si y solo si el período no tiene ventas (RF-3).
  averageTicketCents: centsSchema.nullable(),
  byPaymentMethod: byPaymentMethodSchema,
  topProducts: z.array(topProductSchema).max(DASHBOARD_TOP_PRODUCTS),
};

const averageMatchesCount = (summary: { salesCount: number; averageTicketCents: number | null }) =>
  (summary.salesCount === 0) === (summary.averageTicketCents === null);
const averageRule = {
  error: 'La venta promedio es null si y solo si no hay ventas',
  path: ['averageTicketCents'],
};

// Las cifras de un período (Datos de un resumen; RF-3 a RF-6).
export const periodSummarySchema = z
  .object(periodSummaryShape)
  .refine(averageMatchesCount, averageRule);
export type PeriodSummary = z.infer<typeof periodSummarySchema>;

// GET /api/dashboard/today (US1; RF-2 a RF-8).
export const todaySummarySchema = z
  .object({ date: boliviaDateSchema, ...periodSummaryShape })
  .refine(averageMatchesCount, averageRule);
export type TodaySummary = z.infer<typeof todaySummarySchema>;

// Una fila de las ventas por día del mes (RF-10).
export const dayTotalSchema = z.object({
  date: boliviaDateSchema,
  totalCents: centsSchema,
  salesCount: countSchema,
});
export type DayTotal = z.infer<typeof dayTotalSchema>;

// GET /api/dashboard/month (US2; RF-9, RF-10): del día 1 a hoy.
export const monthSummarySchema = z
  .object({
    month: boliviaMonthSchema,
    ...periodSummaryShape,
    days: z.array(dayTotalSchema).min(1).max(31),
  })
  .refine(averageMatchesCount, averageRule);
export type MonthSummary = z.infer<typeof monthSummarySchema>;
