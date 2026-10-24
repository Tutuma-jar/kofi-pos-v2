import {
  saleQuoteSchema,
  saleResponseSchema,
  type RegisterSaleRequest,
  type Sale,
  type SaleQuote,
  type SaleQuoteRequest,
} from '@kofi/contracts';
import { apiFetch } from '../../../shared/http/api-fetch.ts';

// Lo que la interfaz necesita de /api/sales (plan §6.2). Lo implementan el cliente HTTP real y el
// cliente simulado de dev/, así que la integración es cambiar uno por otro (D-10). Los errores
// llegan como ApiFetchError.

export interface SalesClient {
  // Calcula la venta en preparación y devuelve los productos para vender (RF-2 a RF-5).
  quote(request: SaleQuoteRequest): Promise<SaleQuote>;
  // Registra la venta; un reintento con el mismo draftId devuelve la misma venta (RF-6 a RF-8).
  register(request: RegisterSaleRequest): Promise<Sale>;
}

export const httpSalesClient: SalesClient = {
  quote: (request) =>
    apiFetch('/api/sales/quote', { method: 'POST', body: request, schema: saleQuoteSchema }),
  async register(request) {
    const { sale } = await apiFetch('/api/sales', {
      method: 'POST',
      body: request,
      schema: saleResponseSchema,
    });
    return sale;
  },
};
