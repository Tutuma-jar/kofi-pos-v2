import { z } from 'zod';

// Contrato del módulo Menú (SPEC-002, plan §6). Las funciones de nombres las usa la API para
// comparar, ordenar y validar; los mensajes están en español y la interfaz los muestra tal cual.

export const CATEGORY_NAME_MAX_LENGTH = 30;
export const PRODUCT_NAME_MAX_LENGTH = 40;

// Letras de a a z con tilde aguda, «ü» y «ñ», dígitos, espacios y . , ' ( ) & / - (plan D-3).
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ0-9 .,'()&/-]+$/;
const NAME_CHARACTERS_MESSAGE =
  "El nombre solo puede tener letras, números, espacios y los signos . , - ' ( ) & /";

// Datos de una categoría y de un producto: sin espacios alrededor y con los seguidos reducidos a
// uno. NFC hace que una «é» escrita con el acento aparte valga lo mismo que la compuesta.
export function normalizeMenuName(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/^ +| +$/g, '')
    .replace(/ {2,}/g, ' ');
}

// Marca temporal para proteger la «ñ», que es una letra distinta de la «n», al quitar las tildes.
const ENYE_MARK = '';

// Clave de «Comparación de nombres» (columna name_key): sin mayúsculas, tildes ni diéresis.
export function menuNameKey(name: string): string {
  return normalizeMenuName(name)
    .toLocaleLowerCase('es')
    .replaceAll('ñ', ENYE_MARK)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replaceAll(ENYE_MARK, 'ñ');
}

// Orden alfabético del español: la «ñ» después de la «n», sin distinguir mayúsculas ni tildes.
const collator = new Intl.Collator('es', { sensitivity: 'base' });

export function compareMenuNames(a: string, b: string): number {
  return collator.compare(a, b);
}

function menuNameSchema(maxLength: number, emptyMessage: string, maxMessage: string) {
  return z
    .string({ error: emptyMessage })
    .transform(normalizeMenuName)
    .pipe(
      z
        .string()
        .min(1, { error: emptyMessage, abort: true })
        .max(maxLength, { error: maxMessage, abort: true })
        .regex(NAME_PATTERN, NAME_CHARACTERS_MESSAGE),
    );
}

export const categoryNameSchema = menuNameSchema(
  CATEGORY_NAME_MAX_LENGTH,
  'Escribe el nombre de la categoría',
  `El nombre de la categoría tiene como máximo ${CATEGORY_NAME_MAX_LENGTH} caracteres`,
);

export const productNameSchema = menuNameSchema(
  PRODUCT_NAME_MAX_LENGTH,
  'Escribe el nombre del producto',
  `El nombre del producto tiene como máximo ${PRODUCT_NAME_MAX_LENGTH} caracteres`,
);

// Precios (Datos de un producto, RF-6, RNF-2): se guardan y viajan como centavos enteros (D-2).
export const PRICE_MAX_CENTS = 100000;

const PRICE_PATTERN = /^(-?)([0-9]+)(?:[.,]([0-9]{1,2}))?$/;
const PRICE_EMPTY_MESSAGE = 'Escribe el precio';
const PRICE_FORMAT_MESSAGE =
  'Escribe el precio en bolivianos, con hasta 2 decimales (por ejemplo, 12,50)';
const PRICE_NOT_POSITIVE_MESSAGE = 'El precio debe ser mayor que 0';
const PRICE_TOO_HIGH_MESSAGE = 'El precio no puede superar Bs 1000,00';

// Convierte el texto escrito en centavos sin pasar por números con decimales; si no cumple,
// devuelve el mensaje del dato (plan §5.2).
function parsePrice(input: string): number | string {
  const text = input.trim();
  if (text === '') return PRICE_EMPTY_MESSAGE;
  const match = PRICE_PATTERN.exec(text);
  if (!match) return PRICE_FORMAT_MESSAGE;

  const [, sign, integerDigits = '', decimalDigits = ''] = match;
  const integer = integerDigits.replace(/^0+(?=.)/, '');
  const decimals = Number(decimalDigits.padEnd(2, '0'));
  if (sign === '-' || (integer === '0' && decimals === 0)) return PRICE_NOT_POSITIVE_MESSAGE;
  // Se compara el texto del entero, para que un número muy largo no pierda precisión.
  if (integer.length > 4) return PRICE_TOO_HIGH_MESSAGE;

  const cents = Number(integer) * 100 + decimals;
  return cents > PRICE_MAX_CENTS ? PRICE_TOO_HIGH_MESSAGE : cents;
}

export const priceSchema = z.string({ error: PRICE_EMPTY_MESSAGE }).transform((input, ctx) => {
  const result = parsePrice(input);
  if (typeof result === 'string') {
    ctx.addIssue({ code: 'custom', message: result });
    return z.NEVER;
  }
  return result;
});

const splitCents = (cents: number) =>
  `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, '0')}`;

// «Bs 12,50»: dos decimales, coma decimal y sin separador de miles (docs/architecture.md §6.7).
export function formatPrice(cents: number): string {
  return `Bs ${splitCents(cents)}`;
}

// «12,50»: el precio guardado, para precargar el formulario de edición.
export function formatPriceInput(cents: number): string {
  return splitCents(cents);
}

const CATEGORY_MISSING_MESSAGE = 'Elige una categoría';

export const categoryIdSchema = z
  .string({ error: CATEGORY_MISSING_MESSAGE })
  .min(1, { error: CATEGORY_MISSING_MESSAGE, abort: true })
  .refine((value) => z.uuid().safeParse(value).success, 'Elige una categoría activa');

// Entradas de las rutas (plan §6.2). La interfaz envía lo escrito tal cual; la API valida.
export const categoryInputSchema = z.object({ name: categoryNameSchema });
export type CategoryInput = z.input<typeof categoryInputSchema>;

export const productInputSchema = z
  .object({ name: productNameSchema, categoryId: categoryIdSchema, price: priceSchema })
  .transform(({ name, categoryId, price }) => ({ name, categoryId, priceCents: price }));
export type ProductInput = z.input<typeof productInputSchema>;

// Entidades y respuestas (plan §6.1, §6.2).
const priceCentsSchema = z.int().min(1).max(PRICE_MAX_CENTS);

export const categorySchema = z.object({ id: z.uuid(), name: z.string(), active: z.boolean() });
export type Category = z.infer<typeof categorySchema>;

export const adminProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  categoryId: z.uuid(),
  priceCents: priceCentsSchema,
  active: z.boolean(),
});
export type AdminProduct = z.infer<typeof adminProductSchema>;

export const menuProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  priceCents: priceCentsSchema,
});
export type MenuProduct = z.infer<typeof menuProductSchema>;

export const categoryResponseSchema = z.object({ category: categorySchema });
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

export const productResponseSchema = z.object({ product: adminProductSchema });
export type ProductResponse = z.infer<typeof productResponseSchema>;

// GET /api/menu/admin (RF-2): todas las categorías y productos, ordenados por la API.
export const adminMenuResponseSchema = z.object({
  categories: z.array(categorySchema.extend({ products: z.array(adminProductSchema) })),
});
export type AdminMenuResponse = z.infer<typeof adminMenuResponseSchema>;

// GET /api/menu (RF-14, RF-15): solo el menú vigente.
export const currentMenuResponseSchema = z.object({
  categories: z.array(
    z.object({ id: z.uuid(), name: z.string(), products: z.array(menuProductSchema) }),
  ),
});
export type CurrentMenuResponse = z.infer<typeof currentMenuResponseSchema>;
