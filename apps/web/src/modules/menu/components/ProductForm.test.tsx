import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { createMenuDemoClient } from '../dev/menu-demo-client.ts';
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from '../dev/fixtures.ts';
import { ProductForm } from './ProductForm.tsx';

describe('formulario de producto (RF-4 a RF-6, RNF-4)', () => {
  it('recorre los campos con teclado y guarda con Intro los textos sin calcular el precio', async () => {
    const client = createMenuDemoClient('loaded');
    const onSave = vi.fn(client.createProduct);
    render(<ProductForm categories={DEMO_CATEGORIES} onSave={onSave} onCancel={() => {}} />);
    const user = userEvent.setup();
    expect(screen.getByLabelText('Nombre del producto')).toHaveFocus();
    expect(screen.getByLabelText('Nombre del producto')).toHaveAttribute('maxlength', '40');
    await user.keyboard('Chocolate');
    await user.tab();
    expect(screen.getByLabelText('Categoría')).toHaveFocus();
    await user.selectOptions(screen.getByLabelText('Categoría'), DEMO_CATEGORIES[0]!.id);
    await user.tab();
    expect(screen.getByLabelText('Precio (Bs)')).toHaveFocus();
    await user.keyboard('12,5{Enter}');
    expect(onSave).toHaveBeenCalledWith({
      name: 'Chocolate',
      categoryId: DEMO_CATEGORIES[0]!.id,
      price: '12,5',
    });
  });
  it('precarga nombre, categoría y precio con dos decimales al editar', () => {
    render(
      <ProductForm
        product={DEMO_PRODUCTS[0]}
        categories={DEMO_CATEGORIES}
        onSave={async () => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText('Nombre del producto')).toHaveValue('Café americano');
    expect(screen.getByLabelText('Categoría')).toHaveValue(DEMO_CATEGORIES[0]!.id);
    expect(screen.getByLabelText('Precio (Bs)')).toHaveValue('12,50');
  });
  it('muestra un error de la API por campo y conserva lo escrito', async () => {
    const onSave = vi.fn().mockRejectedValue(
      new ApiFetchError(400, {
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos',
        fields: {
          name: 'Ya existe un producto con ese nombre',
          categoryId: 'Elige una categoría',
          price: 'El precio debe ser mayor que 0',
        },
      }),
    );
    render(<ProductForm categories={DEMO_CATEGORIES} onSave={onSave} onCancel={() => {}} />);
    await userEvent.keyboard('Café');
    await userEvent.type(screen.getByLabelText('Precio (Bs)'), '0{Enter}');
    for (const text of [
      'Ya existe un producto con ese nombre',
      'Elige una categoría',
      'El precio debe ser mayor que 0',
    ])
      expect(await screen.findByText(text, { selector: 'p' })).toBeVisible();
    expect(screen.getByLabelText('Nombre del producto')).toHaveValue('Café');
    expect(screen.getByLabelText('Precio (Bs)')).toHaveValue('0');
    expect(screen.getByLabelText('Categoría')).toHaveValue('');
  });
  it('explica por qué no se puede crear sin categorías activas', () => {
    render(<ProductForm categories={[]} onSave={async () => {}} onCancel={() => {}} />);
    expect(
      screen.getByText('Crea o reactiva una categoría antes de añadir productos'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Guardar producto' })).not.toBeInTheDocument();
  });
});
