import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/admin-validation'
import { handleRouteError, rpcMessage } from '@/lib/admin-api-utils'
import { parseProductPayload } from '@/lib/product-validation'
import type { AdminProductRow } from '@/lib/catalog-types'

const PRODUCT_SELECT = [
  'id',
  'name',
  'description',
  'price',
  'category',
  'image_url',
  'category_id',
  'subcategory_id',
  'subcategory',
  'is_active',
  'slug',
  'seo_title',
  'seo_description',
  'sale_price',
  'sale_starts_at',
  'sale_ends_at',
  'images',
  'created_at',
  'updated_at',
  'cat:categories!products_category_id_fkey(id,name,slug)',
  'subcat:categories!products_subcategory_id_fkey(id,name,slug)',
  'product_variants(id,name,price,is_active,created_at)',
  'product_inventory(id,quantity,variant_id,last_updated)',
].join(',')

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const { data, error } = await admin.client
      .from('products')
      .select(PRODUCT_SELECT)
      .order('updated_at', { ascending: false })
      .limit(300)

    if (error) {
      throw new ValidationError('Unable to load products.')
    }

    const products = data as unknown as AdminProductRow[] | null
    return NextResponse.json({ products: products ?? [] })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`admin_product_create:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    const body = await request.json().catch(() => ({}))
    const product = parseProductPayload(body)

    const { data, error } = await admin.client.rpc('admin_create_product', {
      p_creator_id: admin.profile.id,
      p_product: {
        name: product.name,
        description: product.description,
        price: product.price,
        category_id: product.categoryId,
        subcategory_id: product.subcategoryId,
        subcategory: null,
        is_active: product.isActive,
        slug: product.slug,
        seo_title: product.seoTitle,
        seo_description: product.seoDescription,
        sale_price: product.sale.price,
        sale_starts_at: product.sale.startsAt,
        sale_ends_at: product.sale.endsAt,
        images: product.images,
      },
      p_variants: product.variants.map((variant) => ({
        name: variant.name,
        price: variant.price,
        is_active: variant.isActive,
        stock: variant.stock,
      })),
    })

    if (error) {
      throw new ValidationError(rpcMessage(error, 'Unable to create the product.'))
    }

    const productId = (data as { id?: string } | null)?.id
    const { data: created } = await admin.client
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', productId as string)
      .single()

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'product_created',
      entity_type: 'product',
      entity_id: productId ?? null,
      changes: { name: product.name, created_by: admin.profile.email },
      ip_address: requestAddress(request),
    })

    return NextResponse.json(
      { product: (created as unknown as AdminProductRow | null) ?? null },
      { status: 201 }
    )
  } catch (err) {
    return handleRouteError(err)
  }
}