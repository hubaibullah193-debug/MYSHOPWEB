import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface OrderRequest {
  customer_email: string
  customer_phone: string
  customer_address: string
  items: Array<{
    product_id: string
    product_name: string
    price: number
    quantity: number
  }>
  total_amount: number
  payment_method: 'cod' | 'jazz_cash' | 'easypaisa'
}

/**
 * POST /api/orders
 * Create a new order with pending_payment status
 * Real-time inventory deduction for website orders
 */
export async function POST(request: NextRequest) {
  try {
    const body: OrderRequest = await request.json()

    // Validate input
    if (
      !body.customer_email ||
      !body.customer_phone ||
      !body.customer_address ||
      !body.items ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Start transaction: create order and deduct inventory
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const customerId = session?.user?.id || null

    // Create order with pending_payment status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone,
        customer_address: body.customer_address,
        items: body.items,
        total_amount: body.total_amount,
        status: 'pending_payment',
        payment_method: body.payment_method,
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Deduct inventory for each item (real-time for website orders, spec §9.1)
    for (const item of body.items) {
      // Update product_inventory quantity
      const { error: inventoryError } = await supabase.rpc('deduct_inventory', {
        product_id: item.product_id,
        quantity: item.quantity,
        order_id: order.id,
      })

      if (inventoryError) {
        console.warn(`Inventory deduction issue for ${item.product_id}:`, inventoryError)
        // Don't fail the order if inventory deduction has issues
        // Admin can manually adjust if needed
      }

      // Create inventory log entry
      await supabase.from('inventory_logs').insert({
        product_id: item.product_id,
        quantity_change: -item.quantity,
        reason: 'order_created',
        order_id: order.id,
      })
    }

    // Create payment record (pending)
    const { error: paymentError } = await supabase.from('payments').insert({
      order_id: order.id,
      amount: body.total_amount,
      method: body.payment_method,
      status: 'pending',
    })

    if (paymentError) {
      console.error('Payment record error:', paymentError)
      // Don't fail the order if payment record creation fails
    }

    return NextResponse.json(
      {
        order_id: order.id,
        status: 'pending_payment',
        message: 'Order created successfully. Awaiting payment confirmation.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
