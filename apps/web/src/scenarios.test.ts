import { describe, expect, it } from 'vitest';
import { requestedScenarios } from './scenarios.ts';

const none = { acceso: false, menu: false, ventas: false, dashboard: false };

describe('requestedScenarios (SPEC-001 DD-17, SPEC-002 D-10, SPEC-003 D-10, SPEC-004 D-8)', () => {
  it.each([
    ['', none],
    ['?otra=1', none],
    ['?escenarios=acceso', { ...none, acceso: true }],
    ['?escenarios=menu', { ...none, menu: true }],
    ['?escenarios=acceso,menu', { ...none, acceso: true, menu: true }],
    ['?escenarios=menu,%20acceso', { ...none, acceso: true, menu: true }],
    ['?escenarios=ventas', { ...none, ventas: true }],
    ['?escenarios=acceso,menu,ventas', { ...none, acceso: true, menu: true, ventas: true }],
    ['?escenarios=ventas,acceso', { ...none, acceso: true, ventas: true }],
    ['?escenarios=venta', none],
    ['?escenarios=dashboard', { ...none, dashboard: true }],
    ['?escenarios=acceso,dashboard', { ...none, acceso: true, dashboard: true }],
    ['?escenarios=dashboard,menu', { ...none, menu: true, dashboard: true }],
    [
      '?escenarios=acceso,menu,ventas,dashboard',
      { acceso: true, menu: true, ventas: true, dashboard: true },
    ],
    ['?escenarios=resumen', none],
  ])('%j activa %o', (search, expected) => {
    expect(requestedScenarios(search)).toEqual(expected);
  });
});
