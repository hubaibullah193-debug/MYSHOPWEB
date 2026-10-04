import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/admin-validation'
import { handleRouteError } from '@/lib/admin-api-utils'
import { parseCategoryPayload } from '@/lib/product-validation'
import type { AdminCategoryRow } from '@/lib/catalog-types'

const CATEGORY_SELECT = [
  'id',
  'name',
  'slug',
  'parent_id',
  'is_active',
  'display_order',
  'created_at',
  'updated_at',
  'products!products_category_id_fkey(id)',
].join(',')

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const { data, error } = await admin.client
      .from('categories')
      .select(CATEGORY_SELECT)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(500)

    if (error) {
      throw new ValidationError('Unable to load categories.')
    }

    const categories = data as unknown as AdminCategoryRow[] | null
    const tree = (categories ?? []).map((category) => ({
      ...category,
      product_count: Array.isArray(category.products) ? category.products.length : 0,
      products: undefined,
    }))

    return NextResponse.json({ categories: tree })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`admin_category_create:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    const body = await request.json().catch(() => ({}))
    const category = parseCategoryPayload(body)

    const { data, error } = await admin.client
      .from('categories')
      .insert({
        name: category.name,
        slug: category.slug,
        parent_id: category.parentId,
        is_active: category.isActive,
        display_order: category.displayOrder,
      })
      .select('id,name,slug,parent_id,is_active,display_order,created_at,updated_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('A category with this slug already exists.')
      }
      if (error.code === '23503') {
        throw new ValidationError('The selected parent category does not exist.')
      }
      throw new ValidationError('Unable to create the category.')
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'category_created',
      entity_type: 'category',
      entity_id: data.id,
      changes: { name: category.name, slug: category.slug },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ category: data }, { status: 201 })
  } catch (err) {
    return handleRouteError(err)
  }
}