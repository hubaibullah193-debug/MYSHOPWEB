import { apiFetch } from '@/lib/api'

export interface CategoryClient {
  id: string
  name: string
  slug: string
  parent_id: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  product_count?: number
}

export interface VariantClient {
  id: string | null
  name: string
  price: number | null
  is_active: boolean
}

export interface ProductClient {
  id: string
  name: string
  description: string | null
  price: number | string
  category: string | null
  image_url: string | null
  category_id: string | null
  subcategory_id: string | null
  is_active: boolean
  slug: string | null
  seo_title: string | null
  seo_description: string | null
  sale_price: number | string | null
  sale_starts_at: string | null
  sale_ends_at: string | null
  images: unknown
  created_at: string
  updated_at: string
  cat: { id: string; name: string; slug: string } | null
  subcat: { id: string; name: string; slug: string } | null
  product_variants: { id: string; name: string; price: number | string | null; is_active: boolean }[]
  product_inventory: { id: string; quantity: number; variant_id: string | null; last_updated: string | null }[]
}

export interface VariantPayload {
  id: string | null
  name: string
  price: number | null
  isActive: boolean
}

export interface ProductPayload {
  name: string
  description: string
  price: number
  categoryId: string | null
  subcategoryId: string | null
  isActive: boolean
  slug: string | null
  seoTitle: string | null
  seoDescription: string | null
  sale: { price: number | null; startsAt: string | null; endsAt: string | null }
  images: string[]
  variants: VariantPayload[]
}

export interface InventoryUnit {
  variant_id: string | null
  variant_name: string | null
  variant_active: boolean
  quantity: number
  last_updated: string | null
}

export interface InventoryEntry {
  product_id: string
  name: string
  category_name: string | null
  is_active: boolean
  current_price: number
  is_on_sale: boolean
  units: InventoryUnit[]
}

export async function listCategories(): Promise<CategoryClient[]> {
  const { categories } = await apiFetch<{ categories: CategoryClient[] }>('/api/admin/categories')
  return categories ?? []
}

export async function createCategory(payload: {
  name: string
  slug: string
  parentId: string | null
  isActive: boolean
  displayOrder: number
}): Promise<CategoryClient> {
  const { category } = await apiFetch<{ category: CategoryClient }>('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return category
}

export async function updateCategory(
  id: string,
  payload: {
    name: string
    slug: string
    parentId: string | null
    isActive: boolean
    displayOrder: number
  }
): Promise<CategoryClient> {
  const { category } = await apiFetch<{ category: CategoryClient }>(`/api/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return category
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/admin/categories/${id}`, { method: 'DELETE' })
}

export async function listProducts(): Promise<ProductClient[]> {
  const { products } = await apiFetch<{ products: ProductClient[] }>('/api/admin/products')
  return products ?? []
}

export async function getProduct(id: string): Promise<ProductClient> {
  const { product } = await apiFetch<{ product: ProductClient }>(`/api/admin/products/${id}`)
  return product
}

export async function createProduct(payload: ProductPayload): Promise<ProductClient> {
  const { product } = await apiFetch<{ product: ProductClient }>('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return product
}

export async function updateProduct(id: string, payload: ProductPayload): Promise<ProductClient> {
  const { product } = await apiFetch<{ product: ProductClient }>(`/api/admin/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return product
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/admin/products/${id}`, { method: 'DELETE' })
}

export async function listInventory(): Promise<InventoryEntry[]> {
  const { inventory } = await apiFetch<{ inventory: InventoryEntry[] }>('/api/admin/inventory')
  return inventory ?? []
}

export async function adjustInventory(payload: {
  productId: string
  variantId: string | null
  quantityChange: number
  reason: string
}): Promise<number> {
  const { quantity } = await apiFetch<{ quantity: number }>('/api/admin/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return quantity
}

export async function uploadProductImage(file: File): Promise<{ url: string; path: string }> {
  const form = new FormData()
  form.append('image', file)
  return apiFetch<{ url: string; path: string }>('/api/admin/uploads/product-image', {
    method: 'POST',
    body: form,
  })
}

export async function removeProductImage(path: string): Promise<void> {
  await apiFetch<{ ok: true }>('/api/admin/uploads/product-image', {
    method: 'DELETE',
    body: JSON.stringify({ path }),
  })
}