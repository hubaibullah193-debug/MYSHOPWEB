import { NextRequest, NextResponse } from 'next/server'
import { logActivity, requireAdmin } from '@/lib/supabase-server'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/admin-validation'
import { handleRouteError, rpcMessage } from '@/lib/admin-api-utils'
import { parseInventoryAdjust } from '@/lib/product-validation'

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`admin_inventory_adjust:${requestAddress(request)}`, 60, 60 * 60 * 1000)
    const admin = await requireAdmin(request)

    const body = await request.json().catch(() => ({}))
    const adjustment = parseInventoryAdjust(body)

    const { data, error } = await admin.client.rpc('admin_adjust_inventory', {
      p_creator_id: admin.profile.id,
      p_product_id: adjustment.productId,
      p_variant_id: adjustment.variantId,
      p_quantity_change: adjustment.quantityChange,
      p_reason: adjustment.reason,
    })

    if (error) {
      throw new ValidationError(rpcMessage(error, 'Unable to adjust the stock.'))
    }

    await logActivity(admin.client, {
      admin_id: admin.profile.id,
      action: 'inventory_adjusted',
      entity_type: 'product',
      entity_id: adjustment.productId,
      changes: {
        variant_id: adjustment.variantId,
        quantity_change: adjustment.quantityChange,
        reason: adjustment.reason,
      },
      ip_address: requestAddress(request),
    })

    return NextResponse.json({ quantity: (data as { quantity?: number }).quantity })
  } catch (err) {
    return handleRouteError(err)
  }
}