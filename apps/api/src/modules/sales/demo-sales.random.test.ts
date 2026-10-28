import { describe, expect, it } from 'vitest';
import { createRandom } from './demo-sales.random.ts';

const sequence = (random: ReturnType<typeof createRandom>, length = 1000) =>
  Array.from({ length }, () => random.next());

describe('generador pseudoaleatorio de las ventas de demostración (D-5)', () => {
  it('da la misma secuencia con la misma semilla, flujo e intento', () => {
    expect(sequence(createRandom(42, 'calendar', 0))).toEqual(
      sequence(createRandom(42, 'calendar', 0)),
    );
  });

  it('da otra secuencia si cambia la semilla, el flujo o el intento', () => {
    const base = sequence(createRandom(42, 'calendar', 0));
    expect(sequence(createRandom(43, 'calendar', 0))).not.toEqual(base);
    expect(sequence(createRandom(42, 'content', 0))).not.toEqual(base);
    expect(sequence(createRandom(42, 'calendar', 1))).not.toEqual(base);
  });

  it('devuelve next() en [0, 1)', () => {
    const values = sequence(createRandom(7, 'content', 0), 10_000);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('devuelve con int(30, 80) solo enteros de 30 a 80, y todos ellos', () => {
    const random = createRandom(7, 'calendar', 0);
    const values = Array.from({ length: 10_000 }, () => random.int(30, 80));
    expect(values.every((value) => Number.isInteger(value) && value >= 30 && value <= 80)).toBe(
      true,
    );
    expect(new Set(values).size).toBe(51);
  });

  it('elige con pick() cualquier elemento de la lista', () => {
    const random = createRandom(7, 'content', 0);
    const items = ['Efectivo', 'QR', 'Otro'];
    const picked = new Set(Array.from({ length: 1000 }, () => random.pick(items)));
    expect(picked).toEqual(new Set(items));
  });

  it('respeta los pesos de weighted() con 2 puntos de tolerancia en 10 000 tiradas', () => {
    const random = createRandom(7, 'content', 0);
    const items = [
      { name: 'Americano', weight: 5 },
      { name: 'Brownie', weight: 3 },
      { name: 'Té', weight: 2 },
    ];
    const counts = new Map<string, number>();
    for (let index = 0; index < 10_000; index++) {
      const item = random.weighted(items, (candidate) => candidate.weight);
      counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
    }
    expect(Math.abs(counts.get('Americano')! / 10_000 - 0.5)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(counts.get('Brownie')! / 10_000 - 0.3)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(counts.get('Té')! / 10_000 - 0.2)).toBeLessThanOrEqual(0.02);
  });

  it('nunca elige con weighted() un elemento de peso 0', () => {
    const random = createRandom(7, 'content', 0);
    const items = [
      { name: 'Salteña', weight: 0 },
      { name: 'Brownie', weight: 1 },
    ];
    for (let index = 0; index < 1000; index++)
      expect(random.weighted(items, (item) => item.weight).name).toBe('Brownie');
  });
});
