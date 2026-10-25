import { Link } from 'react-router';
import { ProductPicker } from '../components/ProductPicker.tsx';
import { SaleDraftLines } from '../components/SaleDraftLines.tsx';
import { useSaleDraft } from '../state/useSaleDraft.ts';

export function NewSalePage() {
  const draft = useSaleDraft();
  return (
    <main>
      <h1>Nueva venta</h1>
      <Link to="/">Volver al inicio</Link>
      {draft.error && <p role="alert">{draft.error}</p>}
      {!draft.quote && draft.busy && <p role="status">Cargando productos…</p>}
      {draft.quote && (
        <>
          <ProductPicker menu={draft.quote.menu} busy={draft.busy} onSelect={draft.addProduct} />
          <SaleDraftLines
            quote={draft.quote}
            busy={draft.busy}
            onIncrement={draft.increment}
            onDecrement={draft.decrement}
            onRemove={draft.remove}
          />
        </>
      )}
    </main>
  );
}
