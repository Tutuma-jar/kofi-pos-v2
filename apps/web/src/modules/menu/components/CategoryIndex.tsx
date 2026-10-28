import { useEffect, useRef, useState, type MouseEvent } from 'react';

// Índice de las categorías del menú: enlaces a cada sección de la misma página, en su mismo orden.
// Con pocas categorías la lista cabe de un vistazo y el índice no aparece.
const MIN_CATEGORIES = 3;
// Distancia bajo el índice a partir de la cual una sección cuenta como la que se está leyendo.
const READING_OFFSET = 32;
// Teclas con las que la persona desplaza la página por su cuenta.
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

export function categoryAnchor(id: string) {
  return `categoria-${id}`;
}

export function CategoryIndex({
  categories,
}: {
  categories: readonly { id: string; name: string; active?: boolean }[];
}) {
  const ref = useRef<HTMLElement>(null);
  // Categoría elegida en el índice: queda resaltada hasta que la persona desplace la página, aunque
  // su sección no llegue arriba porque la página ya terminó.
  const chosen = useRef<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const shown = categories.length >= MIN_CATEGORIES;
  const ids = categories.map((category) => category.id).join(',');

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

  // Al desplazarse, resalta la categoría que se está leyendo: la última cuya sección ya pasó bajo el
  // índice, o la última de todas al llegar al final de la página.
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const sectionIds = ids.split(',');
    let frame = 0;
    const update = () => {
      frame = 0;
      if (chosen.current) return;
      const limit = nav.offsetHeight + READING_OFFSET;
      let next: string | null = null;
      for (const id of sectionIds) {
        const section = document.getElementById(categoryAnchor(id));
        if (!section || section.getBoundingClientRect().top > limit) break;
        next = id;
      }
      const root = document.documentElement;
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 2)
        next = sectionIds.at(-1) ?? next;
      setCurrent(next);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const release = (event: Event) => {
      if (event instanceof KeyboardEvent && !SCROLL_KEYS.has(event.key)) return;
      if (!chosen.current) return;
      chosen.current = null;
      schedule();
    };
    const userScroll = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    for (const type of userScroll) window.addEventListener(type, release, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      for (const type of userScroll) window.removeEventListener(type, release);
    };
  }, [ids, shown]);

  // En la fila desplazable del móvil, el enlace resaltado se mantiene a la vista.
  useEffect(() => {
    const list = ref.current?.querySelector('ul');
    const link = list?.querySelector<HTMLElement>('[aria-current]');
    if (!list || !link || list.scrollWidth <= list.clientWidth) return;
    const start = link.offsetLeft - list.offsetLeft;
    const end = start + link.offsetWidth;
    if (start < list.scrollLeft || end > list.scrollLeft + list.clientWidth)
      list.scrollTo({ left: start - (list.clientWidth - link.offsetWidth) / 2 });
  }, [current]);

  // Salta sin añadir una entrada al historial por cada categoría y lleva el foco al encabezado,
  // para que «Atrás» salga del menú y el siguiente Tab siga dentro de la sección elegida.
  function jump(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const section = document.getElementById(categoryAnchor(id));
    if (!section) return;
    event.preventDefault();
    chosen.current = id;
    setCurrent(id);
    section.scrollIntoView({ block: 'start' });
    section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }

  if (!shown) return null;
  return (
    <nav className="menu__index" aria-label="Categorías" ref={ref}>
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            <a
              href={`#${categoryAnchor(category.id)}`}
              className={category.active === false ? 'menu__index-inactive' : undefined}
              aria-current={current === category.id ? 'location' : undefined}
              onClick={(event) => jump(event, category.id)}
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
