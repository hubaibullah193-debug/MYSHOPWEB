import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/admin-validation'
import { handleRouteError } from '@/lib/admin-api-utils'
import { parseDeliveryZonePayload } from '@/lib/product-validation'
import type { AdminDeliveryZoneRow } from '@/lib/delivery-types'

const ZONE_SELECT = [
  'id',
  'name',
  'fee',
  'is_active',
  'display_order',
  'created_at',
  'updated_at',
  'orders!orders_delivery_zone_id_fkey(id)',
].join(',')

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const { data, error } = await admin.client
      .from('delivery_zones')
      .select(ZONE_SELECT)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(500)

    if (error) {
      throw new ValidationError('Unable to load delivery zones.')
    }

    const zones = data as unknown as AdminDeliveryZoneRow[] | null
    const tree = (zones ?? []).map((zone) => ({
      ...zone,
      order_count: Array.isArray(zone.orders) ? zone.orders.length : 0,
      orders: undefined,
    }))

    return NextResponse.json({ zones: tree })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`admin_delivery_zone_create:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    const body = await request.json().catch(() => ({}))
    const zone = parseDeliveryZonePayload(body)

    const { data, error } = await admin.client
      .from('delivery_zones')
      .insert({
        name: zone.name,
        fee: zone.fee,
        is_active: zone.isActive,
        display_order: zone.displayOrder,
      })
      .select('id,name,fee,is_active,display_order,created_at,updated_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('A delivery zone with this name already exists.')
      }
      throw new ValidationError('Unable to create the delivery zone.')
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'delivery_zone_created',
      entity_type: 'delivery_zone',
      entity_id: data.id,
      changes: { name: zone.name, fee: zone.fee },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ zone: data }, { status: 201 })
  } catch (err) {
    return handleRouteError(err)
  }
}