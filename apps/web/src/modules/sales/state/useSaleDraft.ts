import { useEffect, useRef, useState } from 'react';
import type { MenuProduct, SaleDraftLine, SaleLine, SaleQuote } from '@kofi/contracts';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { useSalesClient } from '../api/SalesClientProvider.tsx';

function draftLines(lines: SaleLine[]) {
  return lines.map(({ productId, productName, quantity, unitPriceCents }) => ({
    productId,
    productName,
    quantity,
    unitPriceCents,
  }));
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiFetchError) return error.error.fields?.lines ?? error.message;
  return error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo';
}

// Solo conserva la elección de productos. Todos los importes y avisos llegan de la API (RF-4).
export function useSaleDraft() {
  const client = useSalesClient();
  const [quote, setQuote] = useState<SaleQuote | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string>();
  const pending = useRef(true);
  useEffect(() => {
    let active = true;
    pending.current = true;
    void client
      .quote({ lines: [] })
      .then((result) => {
        if (active) setQuote(result);
      })
      .catch((failure: unknown) => {
        if (active) setError(errorMessage(failure));
      })
      .finally(() => {
        if (active) {
          pending.current = false;
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [client]);

  async function calculate(lines: SaleDraftLine[]) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      setQuote(await client.quote({ lines }));
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const lines = () => draftLines(quote?.lines ?? []);
  return {
    quote,
    busy,
    error,
    async addProduct(product: MenuProduct) {
      const desired = lines();
      const existing = desired.find((line) => line.productId === product.id);
      if (existing) existing.quantity += 1;
      else
        return calculate([
          ...desired,
          { productId: product.id, productName: product.name, quantity: 1 },
        ]);
      await calculate(desired);
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
