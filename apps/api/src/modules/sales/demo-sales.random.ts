// Generador pseudoaleatorio con semilla para las ventas de demostración (SPEC-007, D-5). La misma
// semilla, flujo e intento dan siempre la misma secuencia: así la carga confirmada repite el [n]
// anunciado y las pruebas son repetibles. Flujos separados ('calendar', 'content') hacen que el
// calendario no dependa del contenido de las ventas.

export type RandomStream = 'calendar' | 'content';

export interface Random {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
}

// FNV-1a de 32 bits: convierte los tres datos en el estado inicial de mulberry32.
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export function createRandom(seed: number, stream: RandomStream, attempt: number): Random {
  let state = hash(`${seed}:${stream}:${attempt}`);
  // mulberry32: un número en [0, 1) por llamada.
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    weighted(items, weight) {
      const weights = items.map(weight);
      let target = next() * weights.reduce((sum, value) => sum + value, 0);
      for (let index = 0; index < items.length; index++) {
        if (weights[index]! <= 0) continue;
        target -= weights[index]!;
        if (target < 0) return items[index]!;
      }
      // Solo por redondeo: el último elemento con peso.
      return items[weights.findLastIndex((value) => value > 0)]!;
    },
  };
}
