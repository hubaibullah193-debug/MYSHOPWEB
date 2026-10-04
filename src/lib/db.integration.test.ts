/**
 * @jest-environment node
 */

/**
 * Phase 1 database integration tests.
 *
 * These run ONLY when real Supabase credentials are present, so they never
 * fail a normal `npm test` in a development environment without a database:
 *
 *   - SUPABASE_TEST_URL
 *   - SUPABASE_TEST_SERVICE_ROLE_KEY
 *   - SUPABASE_TEST_ANON_KEY       (optional; enables RLS checks)
 *
 * Required before running: apply migrations 001 -> 002 -> 003 -> 004 -> 005
 * to the target project (see supabase/tests/verify_phase1.sql), and seed at
 * least the roles the tests create themselves. The suite creates its own admin,
 * products, inventory, delivery zones and guest orders; it never touches
 * application data.
 *
 * Business rules verified here:
 *   - guest COD order creation + item snapshots + server-side totals
 *   - delivery zone rules: courier requires an active zone, pickup forbids
 *     zones, and the delivery fee is derived from the zone server-side
 *   - idempotency (same key -> same order; key + different hash -> rejected)
 *   - online payment requires transaction reference + valid payment evidence
 *   - atomic exactly-once inventory deduction on received -> processing
 *   - insufficient stock fails the WHOLE transition without partial deduction
 *   - cancellation rules (before processing only; paid orders excluded)
 *   - payment lifecycle confirm/fail/refund + ordering rules
 *   - RLS: anonymous role cannot read/write orders or list evidence bucket
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'node:crypto'

const url = process.env.SUPABASE_TEST_URL
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_TEST_ANON_KEY

interface OrderRow {
  id: string
  status: string
  payment_status: string
  payment_method: string
  total_amount: number
  delivery_fee?: number | string | null
  delivery_zone_id?: string | null
  items: Array<{ product_id: string; product_name: string; price: number; quantity: number }>
}

interface ProductInventoryRow {
  id: string
  product_id: string
  quantity: number
}

const testSuffix = randomUUID().slice(0, 8)
const adminId = randomUUID()
const productAId = randomUUID()
const productBId = randomUUID()
const productCId = randomUUID()
const testZoneId = randomUUID()
const paidZoneId = randomUUID()

const createdOrderIds: string[] = []
const createdZoneIds: string[] = []
const uploadedEvidenceKeys: string[] = []

const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)

function idempotencyKey(): string {
  return `it-${testSuffix}-${randomUUID()}`
}

function requestHash(payload: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

async function uploadEvidence(admin: SupabaseClient): Promise<string> {
  const key = `payment-evidence/${randomUUID()}.png`
  const { error } = await admin.storage.from('payment-evidence').upload(key, ONE_PX_PNG, {
    contentType: 'image/png',
    upsert: false,
  })
  if (error) {
    throw new Error(`Failed to upload test evidence: ${error.message}`)
  }
  uploadedEvidenceKeys.push(key)
  return key
}

async function createOrder(
  admin: SupabaseClient,
  input: {
    key: string
    hash: string
    name?: string
    email?: string
    phone?: string
    address?: string
    items: Array<{ product_id: string; quantity: number }>
    total: number
    paymentMethod: 'cod' | 'jazz_cash' | 'easypaisa'
    deliveryMethod?: 'courier' | 'self'
    zoneId?: string | null
    transactionId?: string | null
    evidence?: string | null
  }
): Promise<OrderRow> {
  const zoneId = input.zoneId !== undefined ? input.zoneId : input.deliveryMethod === 'self' ? null : testZoneId
  const { data, error } = await admin.rpc('create_order_with_payment', {
    p_customer_id: null,
    p_customer_name: input.name ?? `Integration Test ${testSuffix}`,
    p_customer_email: input.email ?? `it-${testSuffix}@example.com`,
    p_customer_phone: input.phone ?? '923001234560',
    p_customer_address: input.address ?? 'Test Area, Adda Bazar, Mohmand, KPK',
    p_items: input.items,
    p_total_amount: input.total,
    p_payment_method: input.paymentMethod,
    p_delivery_method: input.deliveryMethod ?? 'courier',
    p_idempotency_key: input.key,
    p_request_hash: input.hash,
    p_transaction_id: input.transactionId ?? null,
    p_payment_evidence: input.evidence ?? null,
    p_delivery_zone_id: zoneId,
  })
  if (error || !data) {
    throw new Error(`create_order_with_payment failed: ${error?.message ?? 'no data'}`)
  }
  const order = data as OrderRow
  createdOrderIds.push(order.id)
  return order
}

async function transition(client: SupabaseClient, orderId: string, status: string): Promise<OrderRow | null> {
  const { data, error } = await client.rpc('transition_order_status', {
    p_order_id: orderId,
    p_new_status: status,
    p_admin_id: adminId,
  })
  if (error) return null
  return data as OrderRow
}

async function transitionError(client: SupabaseClient, orderId: string, status: string): Promise<string> {
  const { error } = await client.rpc('transition_order_status', {
    p_order_id: orderId,
    p_new_status: status,
    p_admin_id: adminId,
  })
  if (!error) throw new Error(`transition to ${status} unexpectedly succeeded.`)
  return error.message ?? 'unknown error'
}

async function inventoryOf(client: SupabaseClient, productId: string): Promise<number> {
  const { data, error } = await client
    .from('product_inventory')
    .select('quantity')
    .eq('product_id', productId)
    .single()
  if (error || !data) throw new Error(`Failed to read inventory for ${productId}`)
  return (data as ProductInventoryRow).quantity
}

async function inventoryLogCountForOrder(client: SupabaseClient, orderId: string): Promise<number> {
  const { data } = await client
    .from('inventory_logs')
    .select('id')
    .eq('order_id', orderId)
  return (data ?? []).length
}

function hashFor(
  input: {
    name?: string
    email?: string
    phone?: string
    address?: string
    items: Array<{ product_id: string; quantity: number }>
    paymentMethod: string
    deliveryMethod?: string
    zoneId?: string | null
    transactionId?: string | null
    evidence?: string | null
  }
): string {
  const deliveryMethod = input.deliveryMethod ?? 'courier'
  const zoneId = input.zoneId !== undefined ? input.zoneId : deliveryMethod === 'self' ? null : testZoneId
  return requestHash({
    customer_name: input.name ?? `Integration Test ${testSuffix}`,
    customer_email: input.email ?? `it-${testSuffix}@example.com`,
    customer_phone: input.phone ?? '923001234560',
    customer_address: input.address ?? 'Test Area, Adda Bazar, Mohmand, KPK',
    items: input.items.map((item) => ({ ...item, product_id: item.product_id })).sort((a, b) => a.product_id.localeCompare(b.product_id)),
    payment_method: input.paymentMethod,
    delivery_method: deliveryMethod,
    transaction_id: input.transactionId ?? null,
    payment_evidence: input.evidence ?? null,
    delivery_zone_id: zoneId,
  })
}

const describeMaybe = url && serviceKey ? describe : describe.skip

describeMaybe('Phase 1 database integration', () => {
  let admin: SupabaseClient
  let evidenceKey: string

  beforeAll(async () => {
    admin = createClient(url as string, serviceKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const adminUser = {
      id: adminId,
      email: `it-admin-${testSuffix}@example.com`,
      phone: '923001234561',
      full_name: 'Integration Admin',
      role: 'admin_staff',
      is_active: true,
    }
    const { error: adminError } = await admin.from('users').insert(adminUser)
    if (adminError) throw new Error(`Failed to create test admin: ${adminError.message}`)

    const products = [
      { id: productAId, name: `IT Product A ${testSuffix}`, price: 100, image_url: null },
      { id: productBId, name: `IT Product B ${testSuffix}`, price: 50, image_url: null },
      { id: productCId, name: `IT Product C ${testSuffix}`, price: 75, image_url: null },
    ]
    const { error: productsError } = await admin.from('products').insert(products)
    if (productsError) throw new Error(`Failed to create test products: ${productsError.message}`)

    const inventory = [
      { product_id: productAId, quantity: 5 },
      { product_id: productBId, quantity: 0 },
      { product_id: productCId, quantity: 3 },
    ]
    const { error: inventoryError } = await admin.from('product_inventory').insert(inventory)
    if (inventoryError) throw new Error(`Failed to create test inventory: ${inventoryError.message}`)

    const zones = [
      { id: testZoneId, name: `IT Zone A ${testSuffix}`, fee: 0, is_active: true },
      { id: paidZoneId, name: `IT Zone B ${testSuffix}`, fee: 50, is_active: true },
    ]
    const { error: zonesError } = await admin.from('delivery_zones').insert(zones)
    if (zonesError) throw new Error(`Failed to create test delivery zones: ${zonesError.message}`)
    createdZoneIds.push(testZoneId, paidZoneId)

    evidenceKey = await uploadEvidence(admin)
  })

  afterAll(async () => {
    if (!admin) return

    for (const key of uploadedEvidenceKeys) {
      await admin.storage.from('payment-evidence').remove([key])
    }
    if (createdOrderIds.length > 0) {
      await admin.from('orders').delete().in('id', createdOrderIds)
    }
    if (createdZoneIds.length > 0) {
      await admin.from('delivery_zones').delete().in('id', createdZoneIds)
    }
    await admin.from('inventory_logs').delete().in('product_id', [productAId, productBId, productCId])
    await admin.from('product_inventory').delete().in('product_id', [productAId, productBId, productCId])
    await admin.from('products').delete().in('id', [productAId, productBId, productCId])
    await admin.from('users').delete().eq('id', adminId)
  })

  test('creates a guest COD order with server-computed totals and snapshots', async () => {
    const key = idempotencyKey()
    const order = await createOrder(admin, {
      key,
      hash: hashFor({ items: [{ product_id: productAId, quantity: 2 }], paymentMethod: 'cod' }),
      items: [{ product_id: productAId, quantity: 2 }],
      total: 200,
      paymentMethod: 'cod',
    })

    expect(order.status).toBe('received')
    expect(order.payment_status).toBe('pending')
    expect(order.payment_method).toBe('cod')
    expect(Number(order.total_amount)).toBe(200)
    expect(Number(order.delivery_fee)).toBe(0)
    expect(order.delivery_zone_id).toBe(testZoneId)
    expect(order.items).toHaveLength(1)
    expect(order.items[0]).toMatchObject({ product_id: productAId, quantity: 2, price: 100 })
  })

  test('derives the delivery fee from the selected zone and enforces zone rules', async () => {
    const items = [{ product_id: productAId, quantity: 1 }]

    await expect(
      createOrder(admin, {
        key: idempotencyKey(),
        hash: hashFor({ items, paymentMethod: 'cod', zoneId: null }),
        items,
        total: 100,
        paymentMethod: 'cod',
        zoneId: null,
      })
    ).rejects.toThrow('Select a delivery zone')

    await expect(
      createOrder(admin, {
        key: idempotencyKey(),
        hash: hashFor({ items, paymentMethod: 'cod', deliveryMethod: 'self', zoneId: testZoneId }),
        items,
        total: 100,
        paymentMethod: 'cod',
        deliveryMethod: 'self',
        zoneId: testZoneId,
      })
    ).rejects.toThrow('Pickup orders do not use a delivery zone')

    const inactiveZoneId = randomUUID()
    const { error: inactiveError } = await admin
      .from('delivery_zones')
      .insert({ id: inactiveZoneId, name: `IT Zone Inactive ${testSuffix}`, fee: 0, is_active: false })
    if (inactiveError) throw new Error(`Failed to create inactive zone: ${inactiveError.message}`)
    createdZoneIds.push(inactiveZoneId)
    await expect(
      createOrder(admin, {
        key: idempotencyKey(),
        hash: hashFor({ items, paymentMethod: 'cod', zoneId: inactiveZoneId }),
        items,
        total: 100,
        paymentMethod: 'cod',
        zoneId: inactiveZoneId,
      })
    ).rejects.toThrow('Delivery zone is not available')

    const paid = await createOrder(admin, {
      key: idempotencyKey(),
      hash: hashFor({ items, paymentMethod: 'cod', zoneId: paidZoneId }),
      items,
      total: 150,
      paymentMethod: 'cod',
      zoneId: paidZoneId,
    })
    expect(Number(paid.total_amount)).toBe(150)
    expect(Number(paid.delivery_fee)).toBe(50)
    expect(paid.delivery_zone_id).toBe(paidZoneId)

    const free = await createOrder(admin, {
      key: idempotencyKey(),
      hash: hashFor({ items, paymentMethod: 'cod' }),
      items,
      total: 100,
      paymentMethod: 'cod',
    })
    expect(Number(free.delivery_fee)).toBe(0)
    expect(free.delivery_zone_id).toBe(testZoneId)
  })

  test('rejects a tampered client-supplied total', async () => {
    const call = createOrder(admin, {
      key: idempotencyKey(),
      hash: hashFor({ items: [{ product_id: productAId, quantity: 1 }], paymentMethod: 'cod' }),
      items: [{ product_id: productAId, quantity: 1 }],
      total: 999,
      paymentMethod: 'cod',
    })
    await expect(call).rejects.toThrow('Order total does not match product prices')
  })

  test('is idempotent: same key + same hash returns the same order', async () => {
    const key = idempotencyKey()
    const hash = hashFor({ items: [{ product_id: productAId, quantity: 1 }], paymentMethod: 'cod' })
    const first = await createOrder(admin, {
      key,
      hash,
      items: [{ product_id: productAId, quantity: 1 }],
      total: 100,
      paymentMethod: 'cod',
    })
    const second = await createOrder(admin, {
      key,
      hash,
      items: [{ product_id: productAId, quantity: 1 }],
      total: 100,
      paymentMethod: 'cod',
    })
    expect(second.id).toBe(first.id)
  })

  test('rejects a reused idempotency key with a different request hash', async () => {
    const key = idempotencyKey()
    await createOrder(admin, {
      key,
      hash: hashFor({ items: [{ product_id: productAId, quantity: 1 }], paymentMethod: 'cod' }),
      items: [{ product_id: productAId, quantity: 1 }],
      total: 100,
      paymentMethod: 'cod',
    })
    const call = createOrder(admin, {
      key,
      hash: hashFor({ items: [{ product_id: productAId, quantity: 2 }], paymentMethod: 'cod' }),
      items: [{ product_id: productAId, quantity: 2 }],
      total: 200,
      paymentMethod: 'cod',
    })
    await expect(call).rejects.toThrow('Idempotency key was already used for a different request')
  })

  test('online orders require a transaction reference and valid payment evidence', async () => {
    const hash = hashFor({ items: [{ product_id: productAId, quantity: 1 }], paymentMethod: 'jazz_cash', evidence: evidenceKey })

    await expect(
      createOrder(admin, {
        key: idempotencyKey(),
        hash,
        items: [{ product_id: productAId, quantity: 1 }],
        total: 100,
        paymentMethod: 'jazz_cash',
        evidence: evidenceKey,
      })
    ).rejects.toThrow('Payment transaction reference is required')

    await expect(
      createOrder(admin, {
        key: idempotencyKey(),
        hash,
        items: [{ product_id: productAId, quantity: 1 }],
        total: 100,
        paymentMethod: 'jazz_cash',
        transactionId: 'TXN-TEST-001',
      })
    ).rejects.toThrow('A valid payment screenshot is required')

    await expect(
      createOrder(admin, {
        key: idempotencyKey(),
        hash,
        items: [{ product_id: productAId, quantity: 1 }],
        total: 100,
        paymentMethod: 'cod',
        evidence: evidenceKey,
      })
    ).rejects.toThrow('COD orders cannot include payment evidence')
  })

  test('insufficient stock fails the whole received -> processing transition atomically', async () => {
    const order = await createOrder(admin, {
      key: idempotencyKey(),
      hash: hashFor({
        items: [
          { product_id: productAId, quantity: 1 },
          { product_id: productBId, quantity: 1 },
        ],
        paymentMethod: 'cod',
      }),
      items: [
        { product_id: productAId, quantity: 1 },
        { product_id: productBId, quantity: 1 },
      ],
      total: 150,
      paymentMethod: 'cod',
    })

    const error = await transitionError(admin, order.id, 'processing')
    expect(error).toMatch(/Insufficient inventory/)

    expect(await inventoryOf(admin, productAId)).toBe(5)
    expect(await inventoryOf(admin, productBId)).toBe(0)
    expect(await inventoryLogCountForOrder(admin, order.id)).toBe(0)
    const statusResult = await admin.from('orders').select('status').eq('id', order.id).single()
    expect((statusResult.data as { status: string } | null)?.status).toBe('received')
  })

  test('deducts inventory exactly once on received -> processing', async () => {
    const order = await createOrder(admin, {
      key: idempotencyKey(),
      hash: hashFor({ items: [{ product_id: productAId, quantity: 1 }], paymentMethod: 'cod' }),
      items: [{ product_id: productAId, quantity: 1 }],
      total: 100,
      paymentMethod: 'cod',
    })

    const first = await transition(admin, order.id, 'processing')
    expect(first?.status).toBe('processing')
    expect(await inventoryOf(admin, productAId)).toBe(4)

    const second = await transition(admin, order.id, 'processing')
    expect(second?.status).toBe('processing')
    expect(await inventoryOf(admin, productAId)).toBe(4)

    const { data: logs } = await admin
      .from('inventory_logs')
      .select('quantity_change')
      .eq('order_id', order.id)
    const changes = (logs ?? []) as Array<{ quantity_change: number }>
    expect(changes).toHaveLength(1)
    expect(changes[0].quantity_change).toBe(-1)
  })

  test('cancellation is only allowed before processing and for unpaid orders', async () => {
    const order = await createOrder(admin, {
      key: idempotencyKey(),
      hash: hashFor({ items: [{ product_id: productCId, quantity: 1 }], paymentMethod: 'cod' }),
      items: [{ product_id: productCId, quantity: 1 }],
      total: 75,
      paymentMethod: 'cod',
    })
    const cancelled = await transition(admin, order.id, 'cancelled')
    expect(cancelled?.status).toBe('cancelled')

    const processed = await createOrder(admin, {
      key: idempotencyKey(),
      hash: hashFor({ items: [{ product_id: productCId, quantity: 1 }], paymentMethod: 'cod' }),
      items: [{ product_id: productCId, quantity: 1 }],
      total: 75,
      paymentMethod: 'cod',
    })
    await transition(admin, processed.id, 'processing')
    await expect(transition(admin, processed.id, 'cancelled')).resolves.toBeNull()
    await expect(
      transitionError(admin, processed.id, 'cancelled')
    ).resolves.toMatch('Order cannot be cancelled after processing')
  })

  test('paid orders cannot be cancelled through the normal workflow', async () => {
    const order = await createOrder(admin, {
      key: idempotencyKey(),
      hash: hashFor({ items: [{ product_id: productCId, quantity: 1 }], paymentMethod: 'jazz_cash', evidence: evidenceKey }),
      items: [{ product_id: productCId, quantity: 1 }],
      total: 75,
      paymentMethod: 'jazz_cash',
      transactionId: 'TXN-PAID-001',
      evidence: evidenceKey,
    })
    const paymentResult = await admin.from('payments').select('id').eq('order_id', order.id).single()
    const paymentId = (paymentResult.data as { id: string } | null)?.id
    if (!paymentId) throw new Error('Failed to read created payment')
    const { error } = await admin.rpc('verify_payment', {
      p_payment_id: paymentId,
      p_admin_id: adminId,
      p_action: 'confirm',
      p_transaction_id: 'TXN-PAID-001',
    })
    expect(error).toBeNull()

    const cancelError = await transitionError(admin, order.id, 'cancelled')
    expect(cancelError).toMatch('Paid orders cannot be cancelled')
  })

  test('verify_payment enforces the payment lifecycle', async () => {
    const evidence = await uploadEvidence(admin)
    const hash = hashFor({ items: [{ product_id: productCId, quantity: 1 }], paymentMethod: 'easypaisa', evidence })

    const order = await createOrder(admin, {
      key: idempotencyKey(),
      hash,
      items: [{ product_id: productCId, quantity: 1 }],
      total: 75,
      paymentMethod: 'easypaisa',
      transactionId: 'TXN-EASY-001',
      evidence,
    })
    const paymentRow = await admin.from('payments').select('*').eq('order_id', order.id).single()
    const payment = paymentRow.data as { id: string; status: string }

    const failNoReason = await admin.rpc('verify_payment', {
      p_payment_id: payment.id,
      p_admin_id: adminId,
      p_action: 'fail',
    })
    expect(failNoReason.error?.message).toMatch('A failure reason is required')
    expect(payment.status).toBe('pending')

    const refutePayment = await admin.rpc('verify_payment', {
      p_payment_id: payment.id,
      p_admin_id: adminId,
      p_action: 'refund',
      p_transaction_id: 'TXN-REF-001',
    })
    expect(refutePayment.error?.message).toMatch('Only paid payments can be refunded')

    const confirm = await admin.rpc('verify_payment', {
      p_payment_id: payment.id,
      p_admin_id: adminId,
      p_action: 'confirm',
      p_transaction_id: 'TXN-EASY-001',
    })
    expect(confirm.error).toBeNull()

    const refreshed = await admin.from('orders').select('status,payment_status').eq('id', order.id).single()
    const refreshedOrder = refreshed.data as { status: string; payment_status: string }
    expect(refreshedOrder.status).toBe('received')
    expect(refreshedOrder.payment_status).toBe('paid')

    const missingRefundRef = await admin.rpc('verify_payment', {
      p_payment_id: payment.id,
      p_admin_id: adminId,
      p_action: 'refund',
    })
    expect(missingRefundRef.error?.message).toMatch('A refund reference is required')

    const refund = await admin.rpc('verify_payment', {
      p_payment_id: payment.id,
      p_admin_id: adminId,
      p_action: 'refund',
      p_transaction_id: 'TXN-REF-001',
    })
    expect(refund.error).toBeNull()

    const confirmAgain = await admin.rpc('verify_payment', {
      p_payment_id: payment.id,
      p_admin_id: adminId,
      p_action: 'confirm',
      p_transaction_id: 'TXN-EASY-001',
    })
    expect(confirmAgain.error?.message).toMatch('Payment cannot be confirmed from its current status')
  })

  if (anonKey) {
    let anon: SupabaseClient

    beforeAll(() => {
      anon = createClient(url as string, anonKey as string, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    })

    test('anonymous role cannot read or write orders (RLS)', async () => {
      const { data } = await anon.from('orders').select('*')
      expect(data ?? []).toHaveLength(0)

      const { error } = await anon.from('orders').insert({
        customer_name: 'Bogus',
        customer_email: 'bogus@example.com',
        customer_phone: '923001234599',
        items: [],
        total_amount: 1,
        status: 'received',
        payment_status: 'pending',
      })
      expect(error).not.toBeNull()
    })

    test('anonymous role cannot list the private payment-evidence bucket (RLS)', async () => {
      const { error } = await anon.storage.from('payment-evidence').list()
      expect(error).not.toBeNull()
    })
  }
})