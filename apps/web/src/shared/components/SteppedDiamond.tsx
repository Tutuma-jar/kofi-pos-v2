import { DIAMOND, DIAMOND_SIZE, EYE, RING, type Cell } from './stepped-diamond.ts';

interface SteppedDiamondProps {
  className?: string;
  // Colores del contorno, el anillo y el ojo; aceptan variables CSS.
  outline: string;
  ring: string;
  eye: string;
}

const rect = ([x, y, width, height]: Cell, fill: string, key?: string) => (
  <rect key={key} x={x} y={y} width={width} height={height} style={{ fill }} />
);

// Un rombo escalonado del aguayo, decorativo y escalable.
export function SteppedDiamond({ className, outline, ring, eye }: SteppedDiamondProps) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${DIAMOND_SIZE} ${DIAMOND_SIZE}`}
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
    >
      {DIAMOND.map((cell) => rect(cell, outline, `d${cell[1]}`))}
      {RING.map((cell) => rect(cell, ring, `r${cell[1]}`))}
      {rect(EYE, eye)}
    </svg>
  );
}
