import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { HISTORY_MESSAGES } from '@kofi/contracts';
import { SaleSearch } from './SaleSearch.tsx';

function Location() {
  return <output aria-label="ruta buscada">{useLocation().pathname}</output>;
}
function mount() {
  render(
    <MemoryRouter initialEntries={['/ventas']}>
      <SaleSearch />
      <Location />
    </MemoryRouter>,
  );
  return userEvent.setup();
}
describe('buscar venta por número (RF-9, RNF-4)', () => {
  it.each([
    [' 007 ', '/ventas/7'],
    ['12345678901234567890', '/ventas/12345678901234567890'],
  ])('normaliza %s sin perder cifras y envía con Intro', async (text, path) => {
    const user = mount();
    await user.tab();
    const field = screen.getByLabelText('Buscar venta por número');
    expect(field).toHaveFocus();
    await user.type(field, text);
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('ruta buscada')).toHaveTextContent(path);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each(['', '0', '-3', '2,5', 'abc', '1e3'])('rechaza «%s» sin navegar', async (text) => {
    const user = mount();
    const field = screen.getByLabelText('Buscar venta por número');
    if (text) await user.type(field, text);
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(HISTORY_MESSAGES.invalidSaleNumber);
    expect(screen.getByLabelText('ruta buscada')).toHaveTextContent(/^\/ventas$/);
  });
});
