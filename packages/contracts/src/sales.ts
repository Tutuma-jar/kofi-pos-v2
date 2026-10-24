import { z } from 'zod';
import { roleSchema } from './auth.ts';
import { currentMenuResponseSchema, PRICE_MAX_CENTS, PRODUCT_NAME_MAX_LENGTH } from './menu.ts';

// Contrato del módulo Ventas (plan §6). La interfaz envía qué productos y cuántas unidades eligió
// la persona; los importes, los avisos y el número de venta los calcula la API (principio 3).

// Límites de una venta (RF-3).
export const SALE_MAX_LINES = 30;
export const SALE_MAX_QUANTITY = 99;

// Textos que la API devuelve y la interfaz muestra tal cual (plan §6.1). `invalidLine` e
// `invalidSale` solo se ven si se esquiva la interfaz, que nunca envía esos datos.
export const SALE_MESSAGES = {
  maxQuantity: `Una venta puede tener como máximo ${SALE_MAX_QUANTITY} unidades de cada producto`,
  maxLines: `Una venta puede tener como máximo ${SALE_MAX_LINES} productos distintos`,
  empty: 'Agrega al menos un producto',
  menuChanged: 'El menú cambió. Revisa la venta antes de registrarla',
  draftTaken: 'Esta venta ya se registró desde otra cuenta',
  invalidLine: 'Revisa los productos de la venta',
  invalidSale: 'Revisa los datos de la venta',
} as const;

const invalidLine = { error: SALE_MESSAGES.invalidLine };

const unitPriceCentsSchema = z
  .int(invalidLine)
  .min(1, invalidLine)
  .max(PRICE_MAX_CENTS, invalidLine);

// Una línea tal como la muestra la interfaz (plan §5.1). `unitPriceCents` es el precio que se
// mostraba; falta en una línea recién agregada, que todavía no se calculó (RF-5).
export const saleDraftLineSchema = z.object(
  {
    productId: z.uuid(invalidLine),
    productName: z
      .string(invalidLine)
      .min(1, invalidLine)
      .max(PRODUCT_NAME_MAX_LENGTH, invalidLine),
    quantity: z
      .int(invalidLine)
      .min(1, invalidLine)
      .max(SALE_MAX_QUANTITY, { error: SALE_MESSAGES.maxQuantity }),
    unitPriceCents: unitPriceCentsSchema.optional(),
  },
  invalidLine,
);
export type SaleDraftLine = z.infer<typeof saleDraftLineSchema>;

// Un producto ocupa una sola línea (RF-3).
const hasDistinctProducts = (lines: { productId: string }[]) =>
  new Set(lines.map((line) => line.productId)).size === lines.length;

const draftLinesSchema = <Line extends z.ZodType<{ productId: string }>>(line: Line) =>
  z
    .array(line, invalidLine)
    .max(SALE_MAX_LINES, { error: SALE_MESSAGES.maxLines })
    .refine(hasDistinctProducts, invalidLine);

// POST /api/sales/quote (RF-2 a RF-5).
export const saleQuoteRequestSchema = z.object({ lines: draftLinesSchema(saleDraftLineSchema) });
export type SaleQuoteRequest = z.infer<typeof saleQuoteRequestSchema>;

// POST /api/sales (RF-6 a RF-8): cada línea con el precio que se mostraba, y el draftId de la venta
// en preparación, para registrarla una sola vez (D-5).
export const registerSaleRequestSchema = z.object({
  draftId: z.uuid({ error: SALE_MESSAGES.invalidSale }),
  lines: draftLinesSchema(saleDraftLineSchema.extend({ unitPriceCents: unitPriceCentsSchema })).min(
    1,
    { error: SALE_MESSAGES.empty },
  ),
});
export type RegisterSaleRequest = z.infer<typeof registerSaleRequestSchema>;

// Respuestas (plan §6.1, §6.2). Los importes los calcula la API; la interfaz los muestra con
// formatPrice y la fecha con formatDateTime (D-7).
const saleQuantitySchema = z.int().min(1).max(SALE_MAX_QUANTITY);

export const saleLineSchema = z.object({
  productId: z.uuid(),
  productName: z.string(),
  categoryName: z.string(),
  quantity: saleQuantitySchema,
  unitPriceCents: z.int().min(1).max(PRICE_MAX_CENTS),
  subtotalCents: z.int().min(1),
});
export type SaleLine = z.infer<typeof saleLineSchema>;

// POST /api/sales/quote: la venta en preparación calculada y los productos para vender, que son el
// menú vigente con el que se calculó (D-2).
export const saleQuoteSchema = z.object({
  lines: z.array(saleLineSchema).max(SALE_MAX_LINES),
  totalCents: z.int().min(0),
  notices: z.array(z.string()),
  menu: currentMenuResponseSchema.shape.categories,
});
export type SaleQuote = z.infer<typeof saleQuoteSchema>;

// Una venta registrada (Datos de una venta registrada, RF-11). `registeredBy` guarda el nombre y el
// rol del momento; `userId` es null si después se eliminó la cuenta.
export const saleSchema = z.object({
  id: z.uuid(),
  number: z.int().min(1),
  registeredAt: z.iso.datetime({ offset: true }),
  registeredBy: z.object({
    userId: z.uuid().nullable(),
    displayName: z.string(),
    role: roleSchema,
  }),
  lines: z.array(saleLineSchema).min(1).max(SALE_MAX_LINES),
  totalCents: z.int().min(1),
});
export type Sale = z.infer<typeof saleSchema>;

// POST /api/sales: 201 si se registró ahora, 200 si esa venta en preparación ya estaba registrada.
export const saleResponseSchema = z.object({ sale: saleSchema });
export type SaleResponse = z.infer<typeof saleResponseSchema>;
