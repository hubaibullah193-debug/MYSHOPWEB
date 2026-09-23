import { supabase } from './supabase'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  created_at: string
  updated_at: string
}

export interface ProductWithInventory extends Product {
  quantity: number
}

/**
 * Fetch all products with current inventory
 */
export async function getProducts(filters?: {
  category?: string
  minPrice?: number
  maxPrice?: number
}) {
  let query = supabase
    .from('products')
    .select(
      `
      *,
      product_inventory:product_inventory(quantity)
    `
    )

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.minPrice) {
    query = query.gte('price', filters.minPrice)
  }

  if (filters?.maxPrice) {
    query = query.lte('price', filters.maxPrice)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []).map((p: any) => ({
    ...p,
    quantity: p.product_inventory[0]?.quantity || 0,
  }))
}

/**
 * Fetch single product by ID with inventory
 */
export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      product_inventory:product_inventory(quantity)
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return {
    ...data,
    quantity: data.product_inventory[0]?.quantity || 0,
  }
}

/**
 * Get unique categories
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .not('category', 'is', null)

  if (error) {
    throw error
  }

  const categories = [...new Set((data || []).map((p: any) => p.category))]
  return categories.filter(Boolean)
}

/**
 * Subscribe to real-time inventory updates for a product
 */
export function subscribeToProductInventory(
  productId: string,
  callback: (quantity: number) => void
) {
  return supabase
    .from('product_inventory')
    .on('UPDATE', (payload: any) => {
      if (payload.new.product_id === productId) {
        callback(payload.new.quantity)
      }
    })
    .subscribe()
}
