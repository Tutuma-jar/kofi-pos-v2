import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEMO_CATEGORIES } from '../dev/fixtures.ts';
import { MenuAdminList } from './MenuAdminList.tsx';

describe('índice de categorías del menú', () => {
  it('enlaza cada categoría con su sección, en el mismo orden', () => {
    render(<MenuAdminList categories={DEMO_CATEGORIES.map((c) => ({ ...c, products: [] }))} />);
    const links = within(screen.getByRole('navigation', { name: 'Categorías' })).getAllByRole(
      'link',
    );
    expect(links.map((link) => link.textContent)).toEqual([
      'Bebidas calientes',
      'Jugos',
      'Temporada',
    ]);
    for (const link of links) {
      const section = document.getElementById(link.getAttribute('href')!.slice(1));
      expect(section).toHaveAccessibleName(link.textContent!);
    }
  });
  it('no aparece con una sola categoría', () => {
    render(<MenuAdminList categories={[{ ...DEMO_CATEGORIES[0]!, products: [] }]} />);
    expect(screen.queryByRole('navigation', { name: 'Categorías' })).not.toBeInTheDocument();
  });
});
