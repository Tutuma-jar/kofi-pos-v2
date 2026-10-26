// Geometría del rombo escalonado del aguayo, sobre una retícula de 4 px en una celda de 28 × 28:
// contorno, anillo y ojo. La usan la tira tejida, el relieve del ingreso y las muestras de módulo.
export type Cell = [x: number, y: number, width: number, height: number];

export const DIAMOND_SIZE = 28;

export const DIAMOND: Cell[] = [
  [12, 4, 4, 4],
  [8, 8, 12, 4],
  [4, 12, 20, 4],
  [8, 16, 12, 4],
  [12, 20, 4, 4],
];

export const RING: Cell[] = [
  [12, 8, 4, 4],
  [8, 12, 12, 4],
  [12, 16, 4, 4],
];

export const EYE: Cell = [12, 12, 4, 4];
