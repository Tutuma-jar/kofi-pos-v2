import {
  adminMenuResponseSchema,
  categoryResponseSchema,
  currentMenuResponseSchema,
  productResponseSchema,
  type AdminMenuResponse,
  type AdminProduct,
  type Category,
  type CategoryInput,
  type CurrentMenuResponse,
  type ProductInput,
} from '@kofi/contracts';
import { apiFetch } from '../../../shared/http/api-fetch.ts';

// Lo que la interfaz necesita de /api/menu (plan §6.2). Lo implementan el cliente HTTP real y el
// cliente simulado de dev/, así que la integración es cambiar uno por otro (D-10). Los errores
// llegan como ApiFetchError.

export type AdminMenuCategory = AdminMenuResponse['categories'][number];
export type CurrentMenuCategory = CurrentMenuResponse['categories'][number];

export interface MenuClient {
  getAdminMenu(): Promise<AdminMenuCategory[]>;
  createCategory(input: CategoryInput): Promise<Category>;
  renameCategory(id: string, input: CategoryInput): Promise<Category>;
  deactivateCategory(id: string): Promise<Category>;
  reactivateCategory(id: string): Promise<Category>;
  createProduct(input: ProductInput): Promise<AdminProduct>;
  updateProduct(id: string, input: ProductInput): Promise<AdminProduct>;
  deactivateProduct(id: string): Promise<AdminProduct>;
  reactivateProduct(id: string): Promise<AdminProduct>;
  getCurrentMenu(): Promise<CurrentMenuCategory[]>;
}

const categoryPath = (id: string) => `/api/menu/categories/${encodeURIComponent(id)}`;
const productPath = (id: string) => `/api/menu/products/${encodeURIComponent(id)}`;

async function categoryRequest(path: string, method: 'POST' | 'PUT', body?: CategoryInput) {
  const { category } = await apiFetch(path, { method, body, schema: categoryResponseSchema });
  return category;
}

async function productRequest(path: string, method: 'POST' | 'PUT', body?: ProductInput) {
  const { product } = await apiFetch(path, { method, body, schema: productResponseSchema });
  return product;
}

export const httpMenuClient: MenuClient = {
  async getAdminMenu() {
    const { categories } = await apiFetch('/api/menu/admin', { schema: adminMenuResponseSchema });
    return categories;
  },
  createCategory: (input) => categoryRequest('/api/menu/categories', 'POST', input),
  renameCategory: (id, input) => categoryRequest(categoryPath(id), 'PUT', input),
  deactivateCategory: (id) => categoryRequest(`${categoryPath(id)}/deactivate`, 'POST'),
  reactivateCategory: (id) => categoryRequest(`${categoryPath(id)}/reactivate`, 'POST'),
  createProduct: (input) => productRequest('/api/menu/products', 'POST', input),
  updateProduct: (id, input) => productRequest(productPath(id), 'PUT', input),
  deactivateProduct: (id) => productRequest(`${productPath(id)}/deactivate`, 'POST'),
  reactivateProduct: (id) => productRequest(`${productPath(id)}/reactivate`, 'POST'),
  async getCurrentMenu() {
    const { categories } = await apiFetch('/api/menu', { schema: currentMenuResponseSchema });
    return categories;
  },
};
