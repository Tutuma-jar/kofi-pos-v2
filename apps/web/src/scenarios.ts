// Escenarios de desarrollo que pide la URL (docs/architecture.md §4.5): `?escenarios=acceso`,
// `?escenarios=menu`, `?escenarios=ventas`, `?escenarios=dashboard`, `?escenarios=historial` o varios
// separados por comas. Sin el parámetro, la aplicación usa la API real también en desarrollo (SPEC-001
// DD-17, SPEC-002 D-10, SPEC-003 D-10, SPEC-004 D-8, SPEC-005 D-9). Solo lo usa main.tsx en desarrollo.

export interface RequestedScenarios {
  acceso: boolean;
  menu: boolean;
  ventas: boolean;
  dashboard: boolean;
  historial: boolean;
}

export function requestedScenarios(search: string): RequestedScenarios {
  const requested = new Set(
    (new URLSearchParams(search).get('escenarios') ?? '').split(',').map((name) => name.trim()),
  );
  return {
    acceso: requested.has('acceso'),
    menu: requested.has('menu'),
    ventas: requested.has('ventas'),
    dashboard: requested.has('dashboard'),
    historial: requested.has('historial'),
  };
}
