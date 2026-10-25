import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createMenuDemoClient } from '../dev/menu-demo-client.ts';
import { DEMO_CATEGORIES } from '../dev/fixtures.ts';
import { CategoryForm } from './CategoryForm.tsx';

describe('formulario de categoría (RF-3, RNF-4)', () => {
  it('crea con teclado e Intro y limita el nombre a 30 caracteres', async () => {
    const client = createMenuDemoClient('empty');
    const onSave = vi.fn(client.createCategory);
    render(<CategoryForm onSave={onSave} onCancel={() => {}} />);
    const user = userEvent.setup();
    expect(screen.getByLabelText('Nombre de la categoría')).toHaveFocus();
    await user.keyboard('Bebidas{Enter}');
    expect(onSave).toHaveBeenCalledWith({ name: 'Bebidas' });
    expect((await client.getAdminMenu())[0]!.name).toBe('Bebidas');
    expect(screen.getByLabelText('Nombre de la categoría')).toHaveAttribute('maxlength', '30');
  });
  it('precarga y renombra sin perder el id', async () => {
    const client = createMenuDemoClient('loaded');
    const category = DEMO_CATEGORIES[0]!;
    const onSave = vi.fn((input) => client.renameCategory(category.id, input));
    render(<CategoryForm category={category} onSave={onSave} onCancel={() => {}} />);
    expect(screen.getByLabelText('Nombre de la categoría')).toHaveValue(category.name);
    await userEvent.clear(screen.getByLabelText('Nombre de la categoría'));
    await userEvent.type(screen.getByLabelText('Nombre de la categoría'), 'Cafés{Enter}');
    expect(onSave).toHaveBeenCalledWith({ name: 'Cafés' });
  });
  it('muestra el error de la API junto al campo y conserva lo escrito', async () => {
    const client = createMenuDemoClient('duplicateName');
    render(<CategoryForm onSave={client.createCategory} onCancel={() => {}} />);
    await userEvent.keyboard('Bebidas{Enter}');
    expect(await screen.findByText('Ya existe una categoría con ese nombre')).toBeVisible();
    expect(screen.getByLabelText('Nombre de la categoría')).toHaveValue('Bebidas');
    expect(screen.getByLabelText('Nombre de la categoría')).toHaveAccessibleDescription(
      'Ya existe una categoría con ese nombre',
    );
  });
});
