import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase-server'
import { ValidationError } from '@/lib/admin-validation'
import { handleRouteError } from '@/lib/admin-api-utils'
import { effectivePrice, isOnSale } from '@/lib/product-validation'
import { toNumber } from '@/lib/catalog-types'

interface InventoryRow {
  id: string
  quantity: number
  variant_id: string | null
  last_updated: string
}

interface ProductInventoryRow {
  id: string
  name: string
  is_active: boolean
  price: number | string
  sale_price: number | string | null
  sale_starts_at: string | null
  sale_ends_at: string | null
  cat: { name: string } | null
  subcat: { name: string } | null
  product_variants: { id: string; name: string; price: number | string | null; is_active: boolean }[]
  product_inventory: InventoryRow[]
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const { data, error } = await admin.client
      .from('products')
      .select(
        [
          'id',
          'name',
          'is_active',
          'price',
          'sale_price',
          'sale_starts_at',
          'sale_ends_at',
          'cat:categories!products_category_id_fkey(name)',
          'subcat:categories!products_subcategory_id_fkey(name)',
          'product_variants(id,name,price,is_active)',
          'product_inventory(id,quantity,variant_id,last_updated)',
        ].join(',')
      )
      .order('name', { ascending: true })
      .limit(500)

    if (error) {
      throw new ValidationError('Unable to load inventory.')
    }

    const products = data as unknown as ProductInventoryRow[] | null
    const inventory = (products ?? []).map((product) => {
      const rows = (product.product_inventory as InventoryRow[] | undefined) ?? []
      const variants = (product.product_variants as
        | { id: string; name: string; price: number | null; is_active: boolean }[]
        | undefined) ?? []
      const displayPrice = effectivePrice({
        price: Number(product.price),
        sale: {
          price: toNumber(product.sale_price),
          startsAt: product.sale_starts_at,
          endsAt: product.sale_ends_at,
        },
      })

      const units =
        variants.length > 0
          ? variants.map((variant) => {
              const row = rows.find((r) => r.variant_id === variant.id)
              return {
                variant_id: variant.id,
                variant_name: variant.name,
                variant_active: variant.is_active,
                quantity: row?.quantity ?? 0,
                last_updated: row?.last_updated ?? null,
              }
            })
          : [
              {
                variant_id: null,
                variant_name: null,
                variant_active: true,
                quantity: rows.find((r) => r.variant_id === null)?.quantity ?? 0,
                last_updated: rows.find((r) => r.variant_id === null)?.last_updated ?? null,
              },
            ]

      return {
        product_id: product.id,
        name: product.name,
        category_name: product.cat?.name ?? product.subcat?.name ?? null,
        is_active: product.is_active,
        current_price: displayPrice,
        is_on_sale: isOnSale({
          price: Number(product.price),
          sale: {
            price: toNumber(product.sale_price),
            startsAt: product.sale_starts_at,
            endsAt: product.sale_ends_at,
          },
        }),
        units,
      }
    })

    return NextResponse.json({ inventory })
  } catch (err) {
    return handleRouteError(err)
  }
}