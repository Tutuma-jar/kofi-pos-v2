import { Link } from 'react-router';
import { useState } from 'react';
import { ProductPicker } from '../components/ProductPicker.tsx';
import { SaleDraftLines } from '../components/SaleDraftLines.tsx';
import { PaymentMethodPicker } from '../components/PaymentMethodPicker.tsx';
import { SaleConfirmation } from '../components/SaleConfirmation.tsx';
import { useSaleDraft } from '../state/useSaleDraft.ts';
import { useSession } from '../../auth/index.ts';
import { DiscardSaleDialog } from '../components/DiscardSaleDialog.tsx';

export function NewSalePage() {
  const { user } = useSession();
  return user ? <SaleEditor key={user.id} userId={user.id} /> : null;
}

function SaleEditor({ userId }: { userId: string }) {
  const draft = useSaleDraft(userId);
  const [discarding, setDiscarding] = useState(false);
  return (
    <main>
      <h1>Nueva venta</h1>
      <Link to="/">Volver al inicio</Link>
      {draft.error && <p role="alert">{draft.error}</p>}
      {draft.confirmation && <SaleConfirmation sale={draft.confirmation} />}
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
          <PaymentMethodPicker
            value={draft.paymentMethod}
            busy={draft.busy}
            onChange={draft.choosePayment}
          />
          <button
            type="button"
            disabled={draft.busy || !draft.quote.lines.length || !draft.paymentMethod}
            onClick={() => void draft.registerSale()}
          >
            Registrar venta
          </button>
          {draft.quote.lines.length > 0 && (
            <>
              <button type="button" disabled={draft.busy} onClick={() => setDiscarding(true)}>
                Descartar venta
              </button>
              {discarding && (
                <DiscardSaleDialog
                  busy={draft.busy}
                  onBack={() => setDiscarding(false)}
                  onDiscard={() => {
                    draft.discard();
                    setDiscarding(false);
                  }}
                />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
