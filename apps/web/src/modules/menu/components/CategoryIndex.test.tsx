import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_CATEGORIES } from '../dev/fixtures.ts';
import { MenuAdminList } from './MenuAdminList.tsx';

const categories = DEMO_CATEGORIES.map((category) => ({ ...category, products: [] }));
const index = () => screen.getByRole('navigation', { name: 'Categorías' });

describe('índice de categorías del menú', () => {
  afterEach(() => {
    // jsdom no implementa `scrollIntoView`: cada prueba que salta lo simula.
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });
  it('enlaza cada categoría con su sección, en el mismo orden', () => {
    render(<MenuAdminList categories={categories} />);
    const links = within(index()).getAllByRole('link');
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
  it('salta sin añadir historial, enfoca el encabezado y marca la categoría', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const historyLength = window.history.length;
    render(<MenuAdminList categories={categories} />);
    const link = within(index()).getByRole('link', { name: 'Jugos' });
    await userEvent.click(link);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe('');
    expect(window.history.length).toBe(historyLength);
    expect(screen.getByRole('heading', { name: 'Jugos' })).toHaveFocus();
    expect(link).toHaveAttribute('aria-current', 'location');
    expect(within(index()).getByRole('link', { name: 'Temporada' })).not.toHaveAttribute(
      'aria-current',
    );
  });
  it('no aparece con menos de tres categorías', () => {
    render(<MenuAdminList categories={categories.slice(0, 2)} />);
    expect(screen.queryByRole('navigation', { name: 'Categorías' })).not.toBeInTheDocument();
  });
});
