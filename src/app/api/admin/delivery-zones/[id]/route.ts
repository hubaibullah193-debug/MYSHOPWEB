import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/admin-validation'
import { handleRouteError } from '@/lib/admin-api-utils'
import { parseDeliveryZonePayload } from '@/lib/product-validation'

const ZONE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin_delivery_zone_update:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    if (!ZONE_UUID_RE.test(params?.id ?? '')) {
      throw new ValidationError('Invalid delivery zone.')
    }
    const zoneId = params.id

    const body = await request.json().catch(() => ({}))
    const zone = parseDeliveryZonePayload(body)

    const { data, error } = await admin.client
      .from('delivery_zones')
      .update({
        name: zone.name,
        fee: zone.fee,
        is_active: zone.isActive,
        display_order: zone.displayOrder,
      })
      .eq('id', zoneId)
      .select('id,name,fee,is_active,display_order,created_at,updated_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('A delivery zone with this name already exists.')
      }
      throw new ValidationError('Unable to update the delivery zone.')
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'delivery_zone_updated',
      entity_type: 'delivery_zone',
      entity_id: zoneId,
      changes: { name: zone.name, fee: zone.fee },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ zone: data })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    enforceRateLimit(`admin_delivery_zone_delete:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    if (!ZONE_UUID_RE.test(params?.id ?? '')) {
      throw new ValidationError('Invalid delivery zone.')
    }
    const zoneId = params.id

    const { data: existing } = await admin.client
      .from('delivery_zones')
      .select('id,name')
      .eq('id', zoneId)
      .single()

    if (!existing) {
      throw new ValidationError('Delivery zone not found.')
    }

    const { error } = await admin.client.from('delivery_zones').delete().eq('id', zoneId)

    if (error) {
      throw new ValidationError('Unable to delete the delivery zone.')
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'delivery_zone_deleted',
      entity_type: 'delivery_zone',
      entity_id: zoneId,
      changes: { name: existing.name },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}