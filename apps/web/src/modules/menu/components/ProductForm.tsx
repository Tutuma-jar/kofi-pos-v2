import {
  PRODUCT_NAME_MAX_LENGTH,
  formatPriceInput,
  type AdminProduct,
  type Category,
  type ProductInput,
} from '@kofi/contracts';
import { useId, useState, type SubmitEvent } from 'react';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';

interface Props {
  product?: AdminProduct;
  categories: readonly Category[];
  onSave(input: ProductInput): Promise<unknown>;
  onCancel(): void;
}

export function ProductForm({ product, categories, onSave, onCancel }: Props) {
  const id = useId();
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [price, setPrice] = useState(product ? formatPriceInput(product.priceCents) : '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const options = categories.filter((category) => category.active);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFields({});
    setError(undefined);
    try {
      await onSave({ name, categoryId, price });
    } catch (error) {
      if (error instanceof ApiFetchError && error.error.fields) setFields(error.error.fields);
      else
        setError(error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }
  if (!options.length && !product)
    return <p>Crea o reactiva una categoría antes de añadir productos</p>;
  const accessibility = (field: string) => ({
    'aria-invalid': Boolean(fields[field]),
    'aria-describedby': fields[field] ? `${id}-${field}-error` : undefined,
  });
  return (
    <form aria-labelledby={`${id}-heading`} onSubmit={submit} noValidate>
      <h2 id={`${id}-heading`}>{product ? 'Editar producto' : 'Crear producto'}</h2>
      <label htmlFor={`${id}-name`}>Nombre del producto</label>
      <input
        id={`${id}-name`}
        autoFocus
        maxLength={PRODUCT_NAME_MAX_LENGTH}
        value={name}
        onChange={(event) => setName(event.target.value)}
        {...accessibility('name')}
      />
      {fields.name && (
        <p role="alert" id={`${id}-name-error`}>
          {fields.name}
        </p>
      )}
      <label htmlFor={`${id}-category`}>Categoría</label>
      <select
        id={`${id}-category`}
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        {...accessibility('categoryId')}
      >
        <option value="">Elige una categoría</option>
        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {fields.categoryId && (
        <p role="alert" id={`${id}-categoryId-error`}>
          {fields.categoryId}
        </p>
      )}
      <label htmlFor={`${id}-price`}>Precio (Bs)</label>
      <input
        id={`${id}-price`}
        inputMode="decimal"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        {...accessibility('price')}
      />
      {fields.price && (
        <p role="alert" id={`${id}-price-error`}>
          {fields.price}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar producto'}
      </button>
      <button type="button" disabled={saving} onClick={onCancel}>
        Cancelar
      </button>
    </form>
  );
}
