import { supabase } from './supabase'
import { effectivePrice, isOnSale } from './product-validation'

export interface ShopVariant {
  id: string
  name: string
  price: number | null
  is_active: boolean
  quantity: number
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: string | null
  image_url: string | null
  images: string[] | null
  sale_price: number | null
  sale_starts_at: string | null
  sale_ends_at: string | null
  is_active: boolean
  slug: string | null
  created_at: string
  updated_at: string
}

export interface ProductWithInventory extends Product {
  quantity: number
  current_price: number
  is_on_sale: boolean
  variants: ShopVariant[]
}

interface ProductRow {
  id: string
  name: string
  description: string | null
  price: number | string
  image_url: string | null
  images: string[] | null
  category: string | null
  sale_price: number | string | null
  sale_starts_at: string | null
  sale_ends_at: string | null
  is_active: boolean
  slug: string | null
  created_at: string
  updated_at: string
  current_price: number | string | null
  product_variants: { id: string; name: string; price: number | string | null; is_active: boolean }[]
  product_inventory: { quantity: number | string; variant_id: string | null }[]
  cat: { name: string } | null
  subcat: { name: string } | null
}

const PRODUCT_SELECT = `
  *,
  product_variants:product_variants(id, name, price, is_active),
  product_inventory:product_inventory(quantity, variant_id),
  cat:categories!products_category_id_fkey(name, slug),
  subcat:categories!products_subcategory_id_fkey(name, slug)
`

function mapProduct(row: ProductRow): ProductWithInventory {
  const basePrice = Number(row.price)
  const sale = {
    price: row.sale_price === null || row.sale_price === '' ? null : Number(row.sale_price),
    startsAt: row.sale_starts_at,
    endsAt: row.sale_ends_at,
  }
  const quantity = (row.product_inventory ?? []).reduce(
    (sum, entry) => sum + (Number(entry.quantity) || 0),
    0
  )
  const quantityByVariant = new Map<string, number>()
  for (const entry of row.product_inventory ?? []) {
    if (entry.variant_id) {
      const current = quantityByVariant.get(entry.variant_id) ?? 0
      quantityByVariant.set(entry.variant_id, current + (Number(entry.quantity) || 0))
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: basePrice,
    category: row.cat?.name ?? row.category ?? null,
    image_url: row.image_url,
    images: row.images,
    sale_price: sale.price,
    sale_starts_at: row.sale_starts_at,
    sale_ends_at: row.sale_ends_at,
    is_active: row.is_active,
    slug: row.slug,
    created_at: row.created_at,
    updated_at: row.updated_at,
    quantity,
    current_price: effectivePrice({ price: basePrice, sale }),
    is_on_sale: isOnSale({ price: basePrice, sale }),
    variants: (row.product_variants ?? []).map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price === null || variant.price === '' ? null : Number(variant.price),
      is_active: variant.is_active,
      quantity: variant.id ? quantityByVariant.get(variant.id) ?? 0 : 0,
    })),
  }
}

/**
 * Fetch active products with current inventory, sale pricing and variants.
 */
export async function getProducts(filters?: {
  category?: string
  minPrice?: number
  maxPrice?: number
}): Promise<ProductWithInventory[]> {
  let query = supabase.from('products').select(PRODUCT_SELECT).eq('is_active', true)

  if (filters?.category) {
    query = query.eq('category_id', filters.category)
  }

  if (filters?.minPrice !== undefined) {
    query = query.gte('current_price', filters.minPrice)
  }

  if (filters?.maxPrice !== undefined) {
    query = query.lte('current_price', filters.maxPrice)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data as unknown as ProductRow[] | null ?? []).map(mapProduct)
}

/**
 * Fetch a single active product by ID with inventory and variants.
 */
export async function getProductById(id: string): Promise<ProductWithInventory> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error) {
    throw error
  }

  return mapProduct(data as unknown as ProductRow)
}

/**
 * Get active top-level categories for filtering.
 */
export async function getCategories(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .is('parent_id', null)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    throw error
  }

  return (data as unknown as { id: string; name: string }[]) ?? []
}

/**
 * Subscribe to real-time inventory updates for a product.
 */
export function subscribeToProductInventory(
  productId: string,
  callback: (quantity: number) => void
) {
  return supabase
    .from('product_inventory')
    .on('UPDATE', (payload: any) => {
      if (payload.new.product_id === productId) {
        callback(Number(payload.new.quantity) || 0)
      }
    })
    .subscribe()
}