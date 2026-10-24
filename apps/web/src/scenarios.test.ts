import { describe, expect, it } from 'vitest';
import { requestedScenarios } from './scenarios.ts';

describe('requestedScenarios (SPEC-001 DD-17, SPEC-002 D-10)', () => {
  it.each([
    ['', { acceso: false, menu: false }],
    ['?otra=1', { acceso: false, menu: false }],
    ['?escenarios=acceso', { acceso: true, menu: false }],
    ['?escenarios=menu', { acceso: false, menu: true }],
    ['?escenarios=acceso,menu', { acceso: true, menu: true }],
    ['?escenarios=menu,%20acceso', { acceso: true, menu: true }],
    ['?escenarios=ventas', { acceso: false, menu: false }],
  ])('%j activa %o', (search, expected) => {
    expect(requestedScenarios(search)).toEqual(expected);
  });
});
