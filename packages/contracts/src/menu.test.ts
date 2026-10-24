import { describe, expect, it } from 'vitest';
import {
  categoryIdSchema,
  categoryNameSchema,
  compareMenuNames,
  formatPrice,
  formatPriceInput,
  menuNameKey,
  normalizeMenuName,
  priceSchema,
  productNameSchema,
} from './menu.ts';

const CHARACTERS_MESSAGE =
  "El nombre solo puede tener letras, números, espacios y los signos . , - ' ( ) & /";

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe('normalizeMenuName', () => {
  it('quita los espacios alrededor y reduce los seguidos a uno', () => {
    expect(normalizeMenuName('  Té   de   coca  ')).toBe('Té de coca');
  });

  it('compone las letras con acento escrito aparte (NFC)', () => {
    expect(normalizeMenuName('Café')).toBe('Café');
  });
});

describe('menuNameKey (Comparación de nombres)', () => {
  it.each([
    ['Café', 'cafe'],
    ['CAFÉ AMERICANO', 'café americano'],
    ['Pingüino', 'pinguino'],
    ['  Té   de coca ', 'te de coca'],
    ['Café', 'Café'],
  ])('«%s» y «%s» tienen la misma clave', (a, b) => {
    expect(menuNameKey(a)).toBe(menuNameKey(b));
  });

  it('la «ñ» es distinta de la «n»', () => {
    expect(menuNameKey('Piña')).not.toBe(menuNameKey('Pina'));
    expect(menuNameKey('PIÑA')).toBe(menuNameKey('piña'));
  });
});

describe('compareMenuNames', () => {
  it('ordena como el alfabeto español: la «ñ» después de la «n»', () => {
    expect(['Pipa', 'Piña', 'Pino', 'Pina'].sort(compareMenuNames)).toEqual([
      'Pina',
      'Pino',
      'Piña',
      'Pipa',
    ]);
  });

  it('no distingue mayúsculas ni tildes', () => {
    expect(compareMenuNames('Café', 'cafe')).toBe(0);
    expect(['té', 'Tarta', 'Torta'].sort(compareMenuNames)).toEqual(['Tarta', 'té', 'Torta']);
  });
});

describe('categoryNameSchema', () => {
  it('normaliza el nombre', () => {
    expect(categoryNameSchema.parse('  Bebidas   calientes ')).toBe('Bebidas calientes');
  });

  it.each(['', '    ', undefined])('rechaza el nombre vacío (%j)', (value) => {
    expect(firstMessage(categoryNameSchema.safeParse(value))).toBe(
      'Escribe el nombre de la categoría',
    );
  });

  it('admite letras con tilde, diéresis y «ñ», dígitos y los signos permitidos', () => {
    expect(categoryNameSchema.parse("Ñandú & Pingüino-2 (d'Ó, a/b).")).toBe(
      "Ñandú & Pingüino-2 (d'Ó, a/b).",
    );
  });

  it.each(['Café ☕', 'Café "doble"', 'Café\ndoble', 'Café\tdoble', 'Crème', 'Café!'])(
    'rechaza un carácter no admitido (%j)',
    (value) => {
      expect(firstMessage(categoryNameSchema.safeParse(value))).toBe(CHARACTERS_MESSAGE);
    },
  );

  it('acepta 30 caracteres y rechaza 31', () => {
    expect(categoryNameSchema.parse('a'.repeat(30))).toHaveLength(30);
    expect(firstMessage(categoryNameSchema.safeParse('a'.repeat(31)))).toBe(
      'El nombre de la categoría tiene como máximo 30 caracteres',
    );
  });
});

describe('productNameSchema', () => {
  it('normaliza el nombre', () => {
    expect(productNameSchema.parse('  café   americano ')).toBe('café americano');
  });

  it('rechaza el nombre vacío', () => {
    expect(firstMessage(productNameSchema.safeParse('  '))).toBe('Escribe el nombre del producto');
  });

  it('rechaza un carácter no admitido', () => {
    expect(firstMessage(productNameSchema.safeParse('Latte 🥛'))).toBe(CHARACTERS_MESSAGE);
  });

  it('acepta 40 caracteres y rechaza 41', () => {
    expect(productNameSchema.parse('b'.repeat(40))).toHaveLength(40);
    expect(firstMessage(productNameSchema.safeParse('b'.repeat(41)))).toBe(
      'El nombre del producto tiene como máximo 40 caracteres',
    );
  });
});

const FORMAT_MESSAGE =
  'Escribe el precio en bolivianos, con hasta 2 decimales (por ejemplo, 12,50)';

describe('priceSchema (Datos de un producto, RF-6)', () => {
  it.each([
    ['12,5', 1250],
    ['12.5', 1250],
    [' 12,50 ', 1250],
    ['12', 1200],
    ['0,01', 1],
    ['0,1', 10],
    ['0,2', 20],
    ['007,5', 750],
    ['1000', 100000],
    ['1000,00', 100000],
    ['999,99', 99999],
  ])('«%s» son %i centavos', (input, cents) => {
    expect(priceSchema.parse(input)).toBe(cents);
  });

  it.each([
    ['', 'Escribe el precio'],
    ['   ', 'Escribe el precio'],
    [undefined, 'Escribe el precio'],
    ['12,505', FORMAT_MESSAGE],
    ['1.000', FORMAT_MESSAGE],
    ['1 000', FORMAT_MESSAGE],
    ['1,000.50', FORMAT_MESSAGE],
    ['Bs 12', FORMAT_MESSAGE],
    ['doce', FORMAT_MESSAGE],
    ['12,', FORMAT_MESSAGE],
    [',5', FORMAT_MESSAGE],
    ['-5,555', FORMAT_MESSAGE],
    ['0', 'El precio debe ser mayor que 0'],
    ['0,00', 'El precio debe ser mayor que 0'],
    ['-5', 'El precio debe ser mayor que 0'],
    ['-0', 'El precio debe ser mayor que 0'],
    ['1000,01', 'El precio no puede superar Bs 1000,00'],
    ['1001', 'El precio no puede superar Bs 1000,00'],
    ['99999999999999999999', 'El precio no puede superar Bs 1000,00'],
  ])('rechaza %j con «%s»', (input, message) => {
    expect(firstMessage(priceSchema.safeParse(input))).toBe(message);
  });
});

describe('formatPrice y formatPriceInput (RNF-2)', () => {
  it.each([
    [1250, 'Bs 12,50', '12,50'],
    [1, 'Bs 0,01', '0,01'],
    [10, 'Bs 0,10', '0,10'],
    [1200, 'Bs 12,00', '12,00'],
    [100000, 'Bs 1000,00', '1000,00'],
  ])('%i centavos se muestran «%s» y se precargan «%s»', (cents, label, input) => {
    expect(formatPrice(cents)).toBe(label);
    expect(formatPriceInput(cents)).toBe(input);
  });

  it('lo escrito, guardado y mostrado coincide', () => {
    expect(formatPrice(priceSchema.parse('12,5'))).toBe('Bs 12,50');
    expect(priceSchema.parse(formatPriceInput(1250))).toBe(1250);
  });
});

describe('categoryIdSchema (RF-6)', () => {
  it('acepta un uuid', () => {
    const id = '1a7e4c2b-9d3f-4e5a-8b6c-7d8e9f0a1bc2';
    expect(categoryIdSchema.parse(id)).toBe(id);
  });

  it.each(['', undefined])('sin categoría (%j) pide elegir una', (value) => {
    expect(firstMessage(categoryIdSchema.safeParse(value))).toBe('Elige una categoría');
  });

  it('un identificador que no es un uuid pide una categoría activa', () => {
    expect(firstMessage(categoryIdSchema.safeParse('bebidas'))).toBe('Elige una categoría activa');
  });
});
