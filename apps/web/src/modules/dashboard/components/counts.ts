export const salesCount = (count: number): string => `${count} ${count === 1 ? 'venta' : 'ventas'}`;
export const unitsCount = (count: number): string =>
  `${count} ${count === 1 ? 'unidad' : 'unidades'}`;
