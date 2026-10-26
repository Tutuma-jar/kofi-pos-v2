import { useId } from 'react';
import { DIAMOND, DIAMOND_SIZE, EYE, RING, type Cell } from './stepped-diamond.ts';
import './WeaveStrip.css';

// Franjas a lo ancho de la tira, en px: color, inicio y grosor. Simétricas, con filetes claros de 2 px
// a cada lado de la banda de pallay (el tejido de rombos), que va al centro.
const BANDS = [
  { color: 'var(--color-weave-orange)', start: 0, size: 8 },
  { color: 'var(--color-weave-light)', start: 8, size: 2 },
  { color: 'var(--color-weave-green)', start: 10, size: 6 },
  { color: 'var(--color-weave-light)', start: 16, size: 2 },
  { color: 'pallay', start: 18, size: 28 },
  { color: 'var(--color-weave-light)', start: 46, size: 2 },
  { color: 'var(--color-weave-green)', start: 48, size: 6 },
  { color: 'var(--color-weave-light)', start: 54, size: 2 },
  { color: 'var(--color-weave-orange)', start: 56, size: 8 },
];
const PALLAY_START = 18;
const PALLAY_WIDTH = DIAMOND_SIZE;

// Los rombos (contorno claro, anillo de color y ojo claro) se alternan a lo largo de la tira: anillo verde y anillo naranja.
const MOTIFS = [
  { offset: 0, ring: 'var(--color-weave-green)' },
  { offset: PALLAY_WIDTH, ring: 'var(--color-weave-orange)' },
];

// Tira tejida de aguayo, la firma visual de Kofi (DESIGN.md). Es decorativa: no lleva texto ni foco.
// Se dibuja en vertical (borde de un panel) o en horizontal (pantallas angostas).
export function WeaveStrip({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  const pallay = `${useId()}-pallay`;
  const vertical = orientation === 'vertical';
  // Las celdas están dadas para la tira vertical; en horizontal se trasponen y el motivo avanza a lo
  // largo de x.
  const place = ([x, y, width, height]: Cell, offset: number) =>
    vertical
      ? { x, y: y + offset, width, height }
      : { x: y + offset, y: x, width: height, height: width };

  return (
    <svg
      className={`weave weave--${orientation}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id={pallay}
          x={vertical ? PALLAY_START : 0}
          y={vertical ? 0 : PALLAY_START}
          width={vertical ? PALLAY_WIDTH : PALLAY_WIDTH * 2}
          height={vertical ? PALLAY_WIDTH * 2 : PALLAY_WIDTH}
          patternUnits="userSpaceOnUse"
        >
          <rect width="100%" height="100%" style={{ fill: 'var(--color-weave-magenta)' }} />
          {MOTIFS.map(({ offset, ring }) => (
            <g key={offset}>
              {DIAMOND.map((cell) => (
                <rect
                  key={`d${cell[1]}`}
                  {...place(cell, offset)}
                  style={{ fill: 'var(--color-weave-light)' }}
                />
              ))}
              {RING.map((cell) => (
                <rect key={`r${cell[1]}`} {...place(cell, offset)} style={{ fill: ring }} />
              ))}
              <rect {...place(EYE, offset)} style={{ fill: 'var(--color-weave-light)' }} />
            </g>
          ))}
        </pattern>
      </defs>
      {BANDS.map(({ color, start, size }) => {
        const fill = color === 'pallay' ? `url(#${pallay})` : color;
        return vertical ? (
          <rect key={start} x={start} y="0" width={size} height="100%" style={{ fill }} />
        ) : (
          <rect key={start} x="0" y={start} width="100%" height={size} style={{ fill }} />
        );
      })}
    </svg>
  );
}
