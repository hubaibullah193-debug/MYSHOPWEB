import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/admin-validation'
import { assertUuid, handleRouteError, rpcMessage } from '@/lib/admin-api-utils'
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request)
    const productId = assertUuid(params?.id, 'product')

    const { data: product, error } = await admin.client
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', productId)
      .single()

    if (error || !product) {
      throw new ValidationError('Product not found.')
    }

    return NextResponse.json({ product: product as unknown as AdminProductRow })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin_product_update:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)
    const productId = assertUuid(params?.id, 'product')

    const body = await request.json().catch(() => ({}))
    const product = parseProductPayload(body)

    const { error } = await admin.client.rpc('admin_update_product', {
      p_creator_id: admin.profile.id,
      p_product_id: productId,
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
        id: variant.id ?? null,
        name: variant.name,
        price: variant.price,
        is_active: variant.isActive,
      })),
    })

    if (error) {
      throw new ValidationError(rpcMessage(error, 'Unable to update the product.'))
    }

    const { data: updated } = await admin.client
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', productId)
      .single()

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'product_updated',
      entity_type: 'product',
      entity_id: productId,
      changes: { name: product.name, updated_by: admin.profile.email },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ product: (updated as unknown as AdminProductRow | null) ?? null })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin_product_delete:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)
    const productId = assertUuid(params?.id, 'product')

    const { data: existing } = await admin.client
      .from('products')
      .select('id,name')
      .eq('id', productId)
      .single()

    if (!existing) {
      throw new ValidationError('Product not found.')
    }

    const { error } = await admin.client.rpc('admin_delete_product', {
      p_creator_id: admin.profile.id,
      p_product_id: productId,
    })

    if (error) {
      throw new ValidationError(rpcMessage(error, 'Unable to delete the product.'))
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'product_deleted',
      entity_type: 'product',
      entity_id: productId,
      changes: { name: existing.name, deleted_by: admin.profile.email },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}