import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser, getSupabaseAdmin, ServerAuthError } from '@/lib/supabase-server'
import { parseIdempotencyKey, parseOrderInput, ValidationError } from '@/lib/validation'
import { enforceRateLimit, requestAddress } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

interface ProductSnapshot {
  id: string
  name: string
  price: number
  image_url?: string | null
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`orders:${requestAddress(request)}`, 10, 60 * 60 * 1000)

    const body = await request.json()
    const orderInput = parseOrderInput(body)
    const idempotencyKey = parseIdempotencyKey(request.headers.get('idempotency-key'))
    const requestHash = createHash('sha256')
      .update(JSON.stringify({
        customer_name: orderInput.customer_name,
        customer_email: orderInput.customer_email,
        customer_phone: orderInput.customer_phone,
        customer_address: orderInput.customer_address,
        items: [...orderInput.items].sort((left, right) => left.product_id.localeCompare(right.product_id)),
        payment_method: orderInput.payment_method,
        delivery_method: orderInput.delivery_method,
        transaction_id: orderInput.transaction_id ?? null,
        payment_evidence: orderInput.payment_evidence ?? null,
      }))
      .digest('hex')
    const requestUser = await getRequestUser(request)
    const admin = getSupabaseAdmin()
    const productIds = orderInput.items.map((item) => item.product_id)

    const { data: products, error: productsError } = await admin
      .from('products')
      .select('id,name,price,image_url')
      .in('id', productIds)

    if (productsError) {
      console.error('Product lookup failed:', productsError)
      return errorResponse('Unable to verify order items', 503)
    }

    const productMap = new Map((products ?? []).map((product) => [product.id, product as ProductSnapshot]))
    const items = orderInput.items.map((item) => {
      const product = productMap.get(item.product_id)
      if (!product) {
        throw new ValidationError('One or more products are no longer available')
      }
      return {
        product_id: product.id,
        product_name: product.name,
        price: Number(product.price),
        quantity: item.quantity,
        image_url: product.image_url ?? null,
      }
    })

    const totalAmount = Math.round(items.reduce((total, item) => total + item.price * item.quantity, 0) * 100) / 100
    if (totalAmount <= 0) {
      throw new ValidationError('Order total must be greater than zero')
    }

    const { data: order, error: orderError } = await admin.rpc('create_order_with_payment', {
      p_customer_id: requestUser?.user.id ?? null,
      p_customer_name: orderInput.customer_name,
      p_customer_email: orderInput.customer_email,
      p_customer_phone: orderInput.customer_phone,
      p_customer_address: orderInput.customer_address,
      p_items: items,
      p_total_amount: totalAmount,
      p_payment_method: orderInput.payment_method,
       p_delivery_method: orderInput.delivery_method,
       p_idempotency_key: idempotencyKey,
       p_request_hash: requestHash,
       p_transaction_id: orderInput.transaction_id ?? null,
       p_payment_evidence: orderInput.payment_evidence ?? null,
    })

    if (orderError || !order) {
      console.error('Order creation failed:', orderError)
      return errorResponse('Unable to create order', 500)
    }

    return NextResponse.json(
      {
        order_id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        idempotency_key: idempotencyKey,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 400)
    }
    if (error instanceof ServerAuthError) {
      return errorResponse(error.message, error.status)
    }
    if (error instanceof Error && error.message === 'Too many requests') {
      return errorResponse('Too many order requests. Please try again later.', 429)
    }

    console.error('Order request failed:', error)
    return errorResponse('Unable to create order', 500)
  }
}
