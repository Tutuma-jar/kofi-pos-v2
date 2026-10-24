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
        .min(1, emptyMessage)
        .max(maxLength, maxMessage)
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
