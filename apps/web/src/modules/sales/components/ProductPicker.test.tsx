import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_MENU } from '../dev/fixtures.ts';
import { ProductPicker } from './ProductPicker.tsx';

const index = () => screen.getByRole('navigation', { name: 'Categorías' });

describe('índice de categorías de Nueva venta', () => {
  afterEach(() => {
    // jsdom no implementa `scrollIntoView`: cada prueba que salta lo simula.
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });
  it('enlaza cada categoría del catálogo con su sección, en el mismo orden', () => {
    render(<ProductPicker menu={DEMO_MENU} busy={false} onSelect={vi.fn()} />);
    const links = within(index()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(DEMO_MENU.map(({ name }) => name));
    for (const link of links) {
      const section = document.getElementById(link.getAttribute('href')!.slice(1));
      expect(section).toHaveAccessibleName(link.textContent!);
    }
  });
  it('salta sin añadir historial, enfoca el encabezado y deja elegir productos', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const onSelect = vi.fn(async () => {});
    const historyLength = window.history.length;
    render(<ProductPicker menu={DEMO_MENU} busy={false} onSelect={onSelect} />);
    const link = within(index()).getByRole('link', { name: 'Jugos' });
    await userEvent.click(link);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe('');
    expect(window.history.length).toBe(historyLength);
    expect(screen.getByRole('heading', { name: 'Jugos' })).toHaveFocus();
    expect(link).toHaveAttribute('aria-current', 'location');
    await userEvent.click(screen.getByRole('button', { name: 'Mocochinchi · Bs 6,00' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
  it('no aparece con menos de tres categorías', () => {
    render(<ProductPicker menu={DEMO_MENU.slice(0, 2)} busy={false} onSelect={vi.fn()} />);
    expect(screen.queryByRole('navigation', { name: 'Categorías' })).not.toBeInTheDocument();
  });
});
