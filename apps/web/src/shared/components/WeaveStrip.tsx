import { useId } from 'react';
import './WeaveStrip.css';

// Franjas a lo ancho de la tira, en px: color, inicio y grosor. La banda de rombos (pallay) va al
// centro.
const BANDS = [
  { color: 'var(--color-weave-orange)', start: 0, size: 10 },
  { color: 'var(--color-weave-light)', start: 10, size: 4 },
  { color: 'var(--color-weave-green)', start: 14, size: 8 },
  { color: 'pallay', start: 22, size: 28 },
  { color: 'var(--color-weave-green)', start: 50, size: 6 },
  { color: 'var(--color-weave-orange)', start: 56, size: 8 },
];
const PALLAY_START = 22;

// Tira tejida de aguayo, la firma visual de Kofi (DESIGN.md). Es decorativa: no lleva texto ni foco.
// Se dibuja en vertical (borde de un panel) o en horizontal (pantallas angostas).
export function WeaveStrip({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  const pallay = `${useId()}-pallay`;
  const vertical = orientation === 'vertical';

  return (
    <svg
      className={`weave weave--${orientation}`}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id={pallay}
          x={vertical ? PALLAY_START : 0}
          y={vertical ? 0 : PALLAY_START}
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <rect width="28" height="28" style={{ fill: 'var(--color-weave-magenta)' }} />
          <path d="M14 3 25 14 14 25 3 14z" style={{ fill: 'var(--color-weave-light)' }} />
          <path d="M14 9 19 14 14 19 9 14z" style={{ fill: 'var(--color-weave-green)' }} />
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
