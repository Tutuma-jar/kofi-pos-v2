import {
  paymentMethodSchema,
  registerSaleRequestSchema,
  saleQuoteRequestSchema,
  type PaymentMethod,
  type SaleDraftLine,
} from '@kofi/contracts';

export const SALE_DRAFT_KEY = 'kofi:sales:draft';
export interface StoredSaleDraft {
  userId: string;
  draftId: string;
  paymentMethod: PaymentMethod | null;
  lines: SaleDraftLine[];
}
// Solo guarda elecciones y precios mostrados, sin totales; reutiliza los límites del contrato.
const storedDraftSchema = registerSaleRequestSchema
  .extend({
    userId: registerSaleRequestSchema.shape.draftId,
    paymentMethod: paymentMethodSchema.nullable(),
    lines: saleQuoteRequestSchema.shape.lines,
  })
  .refine((draft) => draft.lines.every((line) => line.unitPriceCents !== undefined));

export const draftStore = {
  load(userId: string): StoredSaleDraft | null {
    try {
      const value = localStorage.getItem(SALE_DRAFT_KEY);
      if (value === null) return null;
      const parsed = storedDraftSchema.safeParse(JSON.parse(value));
      if (parsed.success && parsed.data.userId === userId) return parsed.data;
      this.clear();
    } catch {
      /* Sin almacenamiento o con JSON inválido, empieza vacía. */
    }
    return null;
  },
  save(draft: StoredSaleDraft) {
    try {
      const valid = storedDraftSchema.parse(draft);
      if (!valid.lines.length && !valid.paymentMethod) {
        this.clear();
        return;
      }
      const value = JSON.stringify(valid);
      if (localStorage.getItem(SALE_DRAFT_KEY) !== value)
        localStorage.setItem(SALE_DRAFT_KEY, value);
    } catch {
      /* El borrador en memoria sigue siendo utilizable. */
    }
  },
  clear() {
    try {
      localStorage.removeItem(SALE_DRAFT_KEY);
    } catch {
      /* El almacenamiento es opcional. */
    }
  },
  subscribe(listener: () => void) {
    const onStorage = (event: StorageEvent) => {
      if (
        (event.key === SALE_DRAFT_KEY || event.key === null) &&
        (!event.storageArea || event.storageArea === localStorage)
      )
        listener();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  },
};
