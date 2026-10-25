import { useEffect, useRef, useState } from 'react';
import type {
  MenuProduct,
  PaymentMethod,
  Sale,
  SaleDraftLine,
  SaleLine,
  SaleQuote,
} from '@kofi/contracts';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { useSalesClient } from '../api/SalesClientProvider.tsx';
import { draftStore, type StoredSaleDraft } from './draft-store.ts';

function draftLines(lines: SaleLine[]) {
  return lines.map(({ productId, productName, quantity, unitPriceCents }) => ({
    productId,
    productName,
    quantity,
    unitPriceCents,
  }));
}
function emptyDraft(userId: string): StoredSaleDraft {
  return { userId, draftId: crypto.randomUUID(), paymentMethod: null, lines: [] };
}
function persistQuote(draft: StoredSaleDraft, quote: SaleQuote): StoredSaleDraft {
  const next = { ...draft, lines: draftLines(quote.lines) };
  draftStore.save(next);
  return next;
}
function errorMessage(error: unknown): string {
  if (error instanceof ApiFetchError) return error.error.fields?.lines ?? error.message;
  return error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo';
}

// Los importes llegan de la API. La generación invalida respuestas anteriores a un cambio de
// otra pestaña o a salir de la pantalla, para no reponer un borrador descartado (RF-12, RF-13).
export function useSaleDraft(userId: string) {
  const client = useSalesClient();
  const draft = useRef<StoredSaleDraft>(emptyDraft(userId));
  const [quote, setQuote] = useState<SaleQuote | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [confirmation, setConfirmation] = useState<Sale | null>(null);
  const pending = useRef(true);
  const sequence = useRef(0);
  useEffect(() => {
    let active = true;
    async function restore() {
      const current = ++sequence.current;
      const saved = draftStore.load(userId) ?? emptyDraft(userId);
      draft.current = saved;
      pending.current = true;
      setBusy(true);
      setError(undefined);
      setPaymentMethod(saved.paymentMethod);
      try {
        const calculated = await client.quote({ lines: saved.lines });
        if (!active || current !== sequence.current) return;
        draft.current = persistQuote(saved, calculated);
        setQuote(calculated);
        if (calculated.lines.length) setConfirmation(null);
      } catch (failure) {
        if (active && current === sequence.current) setError(errorMessage(failure));
      } finally {
        if (active && current === sequence.current) {
          pending.current = false;
          setBusy(false);
        }
      }
    }
    const unsubscribe = draftStore.subscribe(() => {
      void restore();
    });
    void restore();
    return () => {
      active = false;
      sequence.current++;
      unsubscribe();
    };
  }, [client, userId]);

  async function calculate(lines: SaleDraftLine[], addedProductId?: string) {
    if (pending.current) return;
    const current = ++sequence.current;
    const saved = draft.current;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const calculated = await client.quote({ lines });
      if (current !== sequence.current) return;
      draft.current = persistQuote(saved, calculated);
      setQuote(calculated);
      if (addedProductId && calculated.lines.some((line) => line.productId === addedProductId))
        setConfirmation(null);
    } catch (failure) {
      if (current === sequence.current) setError(errorMessage(failure));
    } finally {
      if (current === sequence.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  const lines = () => draftLines(quote?.lines ?? []);
  return {
    quote,
    busy,
    error,
    paymentMethod,
    confirmation,
    choosePayment(method: PaymentMethod) {
      if (pending.current) return;
      draft.current = { ...draft.current, paymentMethod: method };
      draftStore.save(draft.current);
      setPaymentMethod(method);
    },
    discard() {
      if (pending.current) return;
      draft.current = emptyDraft(userId);
      draftStore.clear();
      setQuote((previous) => previous && { ...previous, lines: [], totalCents: 0, notices: [] });
      setPaymentMethod(null);
      setError(undefined);
    },
    async registerSale() {
      if (pending.current || !quote?.lines.length || !paymentMethod) return;
      const current = ++sequence.current;
      const saved = draft.current;
      pending.current = true;
      setBusy(true);
      setError(undefined);
      try {
        const sale = await client.register({
          draftId: saved.draftId,
          paymentMethod,
          lines: lines(),
        });
        if (current !== sequence.current) return;
        draft.current = emptyDraft(userId);
        draftStore.clear();
        setConfirmation(sale);
        setQuote({ ...quote, lines: [], totalCents: 0, notices: [] });
        setPaymentMethod(null);
      } catch (failure) {
        if (current !== sequence.current) return;
        if (failure instanceof ApiFetchError && failure.code === 'MENU_CHANGED') {
          setError(failure.message);
          try {
            const calculated = await client.quote({ lines: saved.lines });
            if (current === sequence.current) {
              draft.current = persistQuote(saved, calculated);
              setQuote(calculated);
            }
          } catch (quoteFailure) {
            if (current === sequence.current) setError(errorMessage(quoteFailure));
          }
        } else {
          setError(
            failure instanceof ApiFetchError && failure.code === 'NETWORK_ERROR'
              ? 'No hay conexión. Inténtalo de nuevo: la venta no se registrará dos veces'
              : errorMessage(failure),
          );
        }
      } finally {
        if (current === sequence.current) {
          pending.current = false;
          setBusy(false);
        }
      }
    },
    async addProduct(product: MenuProduct) {
      const desired = lines();
      const existing = desired.find((line) => line.productId === product.id);
      if (existing) existing.quantity += 1;
      else
        return calculate(
          [...desired, { productId: product.id, productName: product.name, quantity: 1 }],
          product.id,
        );
      await calculate(desired, product.id);
    },
    increment: (id: string) =>
      calculate(
        lines().map((line) =>
          line.productId === id ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      ),
    async decrement(id: string) {
      if (!quote?.lines.some((line) => line.productId === id && line.quantity > 1)) return;
      await calculate(
        lines().map((line) =>
          line.productId === id ? { ...line, quantity: line.quantity - 1 } : line,
        ),
      );
    },
    remove: (id: string) => calculate(lines().filter((line) => line.productId !== id)),
  };
}
