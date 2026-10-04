import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/admin-validation'
import { handleRouteError } from '@/lib/admin-api-utils'
import { parseCategoryPayload } from '@/lib/product-validation'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin_category_update:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params?.id ?? '')) {
      throw new ValidationError('Invalid category.')
    }
    const categoryId = params.id

    const body = await request.json().catch(() => ({}))
    const category = parseCategoryPayload(body)

    if (category.parentId === categoryId) {
      throw new ValidationError('A category cannot be its own parent.')
    }

    const { data, error } = await admin.client
      .from('categories')
      .update({
        name: category.name,
        slug: category.slug,
        parent_id: category.parentId,
        is_active: category.isActive,
        display_order: category.displayOrder,
      })
      .eq('id', categoryId)
      .select('id,name,slug,parent_id,is_active,display_order,created_at,updated_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('A category with this slug already exists.')
      }
      if (error.code === '23503') {
        throw new ValidationError('The selected parent category does not exist.')
      }
      throw new ValidationError('Unable to update the category.')
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'category_updated',
      entity_type: 'category',
      entity_id: categoryId,
      changes: { name: category.name },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ category: data })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin_category_delete:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params?.id ?? '')) {
      throw new ValidationError('Invalid category.')
    }
    const categoryId = params.id

    const { data: existing } = await admin.client
      .from('categories')
      .select('id,name')
      .eq('id', categoryId)
      .single()

    if (!existing) {
      throw new ValidationError('Category not found.')
    }

    const { error } = await admin.client.from('categories').delete().eq('id', categoryId)

    if (error) {
      throw new ValidationError('Unable to delete the category.')
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'category_deleted',
      entity_type: 'category',
      entity_id: categoryId,
      changes: { name: existing.name },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}