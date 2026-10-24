import { describe, expect, it } from 'vitest';
import { createFakeClock, systemClock } from './clock.ts';

describe('systemClock', () => {
  it('da la hora actual', () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe('createFakeClock', () => {
  const start = new Date('2026-11-03T07:58:00-04:00');

  it('empieza en la hora indicada y no avanza sola', () => {
    const clock = createFakeClock(start);
    expect(clock.now()).toEqual(start);
    expect(clock.now()).toEqual(start);
  });

  it('se puede fijar en otra hora', () => {
    const clock = createFakeClock(start);
    const later = new Date('2026-11-03T20:00:00-04:00');
    clock.set(later);
    expect(clock.now()).toEqual(later);
  });

  it('se puede adelantar', () => {
    const clock = createFakeClock(start);
    clock.advance(12 * 60 * 60 * 1000);
    expect(clock.now()).toEqual(new Date('2026-11-03T19:58:00-04:00'));
  });

  it('devuelve copias: cambiar la fecha devuelta no mueve el reloj', () => {
    const clock = createFakeClock(start);
    clock.now().setFullYear(2000);
    expect(clock.now()).toEqual(start);
  });
});
