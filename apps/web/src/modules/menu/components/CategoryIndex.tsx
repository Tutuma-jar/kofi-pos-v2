import { useEffect, useRef } from 'react';

// Índice de las categorías del menú: enlaces a cada sección de la misma página, en su mismo orden.
export function categoryAnchor(id: string) {
  return `categoria-${id}`;
}

export function CategoryIndex({
  categories,
}: {
  categories: readonly { id: string; name: string; active?: boolean }[];
}) {
  const ref = useRef<HTMLElement>(null);
  const shown = categories.length >= 2;
  // El índice queda fijo arriba y puede ocupar varias filas: su altura real separa del borde la
  // sección a la que se salta (menu.css, `scroll-margin-top`).
  useEffect(() => {
    const nav = ref.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--menu-index-height', `${nav.offsetHeight}px`),
    );
    observer.observe(nav);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--menu-index-height');
    };
  }, [shown]);
  if (!shown) return null;
  return (
    <nav className="menu__index" aria-label="Categorías" ref={ref}>
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            <a
              href={`#${categoryAnchor(category.id)}`}
              className={category.active === false ? 'menu__index-inactive' : undefined}
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
