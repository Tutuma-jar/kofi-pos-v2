import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_IDS } from '../dev/fixtures.ts';
import { draftStore, SALE_DRAFT_KEY, type StoredSaleDraft } from './draft-store.ts';

const draft: StoredSaleDraft = {
  userId: DEMO_IDS.cashier,
  draftId: crypto.randomUUID(),
  paymentMethod: 'qr',
  lines: [
    {
      productId: DEMO_IDS.americano,
      productName: 'Café americano',
      quantity: 2,
      unitPriceCents: 1250,
    },
  ],
};
beforeEach(() => localStorage.clear());
describe('almacén de la venta en preparación (RF-10, RF-12, RF-13)', () => {
  it('guarda solo cuenta, identificador, medio de pago y líneas, sin importes calculados', () => {
    draftStore.save(draft);
    expect(JSON.parse(localStorage.getItem(SALE_DRAFT_KEY)!)).toEqual(draft);
    expect(draftStore.load(draft.userId)).toEqual(draft);
    draftStore.clear();
    expect(draftStore.load(draft.userId)).toBeNull();
  });
  it('descarta el borrador de otra cuenta y no lo recupera al volver', () => {
    draftStore.save(draft);
    expect(draftStore.load(crypto.randomUUID())).toBeNull();
    expect(draftStore.load(draft.userId)).toBeNull();
  });
  it.each([
    '{',
    '{}',
    JSON.stringify({ ...draft, paymentMethod: 'card' }),
    JSON.stringify({ ...draft, lines: [{ ...draft.lines[0], unitPriceCents: undefined }] }),
  ])('empieza vacío con datos inválidos: %s', (value) => {
    localStorage.setItem(SALE_DRAFT_KEY, value);
    expect(draftStore.load(draft.userId)).toBeNull();
  });
  it('tolera fallos de lectura, escritura y borrado', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('no disponible');
    });
    expect(draftStore.load(draft.userId)).toBeNull();
    get.mockRestore();
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('sin espacio');
    });
    expect(() => draftStore.save(draft)).not.toThrow();
    set.mockRestore();
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('no disponible');
    });
    expect(() => draftStore.clear()).not.toThrow();
    remove.mockRestore();
  });
  it('notifica solo cambios de esta clave o un vaciado de localStorage y permite cancelar', () => {
    const listener = vi.fn();
    const unsubscribe = draftStore.subscribe(listener);
    window.dispatchEvent(new StorageEvent('storage', { key: 'otra' }));
    expect(listener).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key: SALE_DRAFT_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', { key: SALE_DRAFT_KEY }));
    expect(listener).toHaveBeenCalledTimes(2);
  });
  it('no reescribe datos idénticos para evitar ciclos entre pestañas', () => {
    draftStore.save(draft);
    const set = vi.spyOn(Storage.prototype, 'setItem');
    draftStore.save(draft);
    expect(set).not.toHaveBeenCalled();
    set.mockRestore();
  });
});
