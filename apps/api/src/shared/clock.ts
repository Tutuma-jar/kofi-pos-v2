// Única fuente de la hora en la API (docs/architecture.md §6.4). Las pruebas usan el reloj falso.
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export interface FakeClock extends Clock {
  set(date: Date): void;
  advance(milliseconds: number): void;
}

export function createFakeClock(start: Date): FakeClock {
  let current = start.getTime();
  return {
    now: () => new Date(current),
    set: (date) => {
      current = date.getTime();
    },
    advance: (milliseconds) => {
      current += milliseconds;
    },
  };
}
