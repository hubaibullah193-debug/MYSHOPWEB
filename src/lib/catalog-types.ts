export interface AdminVariantRow {
  id: string
  name: string
  price: number | string | null
  is_active: boolean
  created_at: string
}

export interface AdminInventoryRow {
  id: string
  quantity: number
  variant_id: string | null
  last_updated: string | null
}

export interface AdminProductRow {
  id: string
  name: string
  description: string | null
  price: number | string
  category: string | null
  image_url: string | null
  category_id: string | null
  subcategory_id: string | null
  subcategory: string | null
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
  product_variants: AdminVariantRow[]
  product_inventory: AdminInventoryRow[]
}

export interface AdminCategoryRow {
  id: string
  name: string
  slug: string
  parent_id: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  products?: { id: string }[]
  product_count?: number
}

export function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

export function isImageList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}