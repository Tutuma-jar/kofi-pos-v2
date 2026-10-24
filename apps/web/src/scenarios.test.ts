import { describe, expect, it } from 'vitest';
import { requestedScenarios } from './scenarios.ts';

describe('requestedScenarios (SPEC-001 DD-17, SPEC-002 D-10, SPEC-003 D-10)', () => {
  it.each([
    ['', { acceso: false, menu: false, ventas: false }],
    ['?otra=1', { acceso: false, menu: false, ventas: false }],
    ['?escenarios=acceso', { acceso: true, menu: false, ventas: false }],
    ['?escenarios=menu', { acceso: false, menu: true, ventas: false }],
    ['?escenarios=acceso,menu', { acceso: true, menu: true, ventas: false }],
    ['?escenarios=menu,%20acceso', { acceso: true, menu: true, ventas: false }],
    ['?escenarios=ventas', { acceso: false, menu: false, ventas: true }],
    ['?escenarios=acceso,menu,ventas', { acceso: true, menu: true, ventas: true }],
    ['?escenarios=ventas,acceso', { acceso: true, menu: false, ventas: true }],
    ['?escenarios=venta', { acceso: false, menu: false, ventas: false }],
  ])('%j activa %o', (search, expected) => {
    expect(requestedScenarios(search)).toEqual(expected);
  });
});
