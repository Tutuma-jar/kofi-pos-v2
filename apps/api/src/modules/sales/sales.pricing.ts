import { formatPrice, type SaleDraftLine, type SaleLine, type SaleQuote } from '@kofi/contracts';

// Cálculo puro sobre una única lectura del menú vigente (RF-4, RF-5, RF-7).
export function priceDraft(draftLines: SaleDraftLine[], menu: SaleQuote['menu']) {
  const products = new Map(
    menu.flatMap((category) =>
      category.products.map(
        (product) => [product.id, { ...product, categoryName: category.name }] as const,
      ),
    ),
  );
  const lines: SaleLine[] = [];
  const notices: string[] = [];
  for (const draft of draftLines) {
    const product = products.get(draft.productId);
    if (!product) {
      notices.push(
        draft.unitPriceCents === undefined
          ? `“${draft.productName}” ya no está en el menú`
          : `Se quitó “${draft.productName}”: ya no está en el menú`,
      );
      continue;
    }
    if (draft.unitPriceCents !== undefined && draft.unitPriceCents !== product.priceCents) {
      notices.push(
        `Cambió el precio de “${draft.productName}”: ahora cuesta ${formatPrice(product.priceCents)}`,
      );
    }
    lines.push({
      productId: product.id,
      productName: product.name,
      categoryName: product.categoryName,
      quantity: draft.quantity,
      unitPriceCents: product.priceCents,
      subtotalCents: product.priceCents * draft.quantity,
    });
  }
  return {
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.subtotalCents, 0),
    notices,
    menuChanged: notices.length > 0,
  };
}
