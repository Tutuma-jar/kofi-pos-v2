import { describe, expect, it } from 'vitest';
import {
  categoryNameSchema,
  compareMenuNames,
  menuNameKey,
  normalizeMenuName,
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
