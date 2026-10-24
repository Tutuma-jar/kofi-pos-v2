import { z } from 'zod';
import { PRICE_MAX_CENTS, PRODUCT_NAME_MAX_LENGTH } from './menu.ts';

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
