import { CATEGORY_NAME_MAX_LENGTH, type Category, type CategoryInput } from '@kofi/contracts';
import { useId, useState, type SubmitEvent } from 'react';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';

interface Props {
  category?: Category;
  onSave(input: CategoryInput): Promise<unknown>;
  onCancel(): void;
  onFailure?(error: unknown): void;
}

export function CategoryForm({ category, onSave, onCancel, onFailure }: Props) {
  const id = useId();
  const [name, setName] = useState(category?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string>();
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFieldError(undefined);
    setError(undefined);
    try {
      await onSave({ name });
    } catch (error) {
      if (error instanceof ApiFetchError && error.error.fields)
        setFieldError(error.error.fields.name);
      else if (!onFailure)
        setError(error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo');
      onFailure?.(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="menu-form" aria-labelledby={`${id}-heading`} onSubmit={submit} noValidate>
      <h2 id={`${id}-heading`}>{category ? 'Renombrar categoría' : 'Crear categoría'}</h2>
      <label htmlFor={id}>Nombre de la categoría</label>
      <input
        id={id}
        autoFocus
        maxLength={CATEGORY_NAME_MAX_LENGTH}
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-invalid={Boolean(fieldError)}
        aria-describedby={fieldError ? `${id}-error` : undefined}
      />
      {fieldError && (
        <p id={`${id}-error`} role="alert">
          {fieldError}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="menu-form__actions">
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar categoría'}
        </button>
        <button type="button" disabled={saving} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
