import {
  normalizePhone,
  parseOrderInput,
  parseOrderTrackingInput,
  parseIdempotencyKey,
  parsePaymentStatusFilter,
  ValidationError,
} from '@/lib/validation'

const productId = '650e8400-e29b-41d4-a716-446655440001'
const zoneId = '741e8400-e29b-41d4-a716-446655440099'

function orderPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    customer_name: 'Test Customer',
    customer_email: 'customer@example.com',
    customer_phone: '03001234567',
    customer_address: 'Karachi, Pakistan',
    items: [{ product_id: productId, quantity: 2 }],
    payment_method: 'cod',
    delivery_method: 'courier',
    delivery_zone_id: zoneId,
    ...overrides,
  }
}

describe('normalizePhone', () => {
  it('normalizes local, international and already-normalized numbers', () => {
    expect(normalizePhone('03001234567')).toBe('923001234567')
    expect(normalizePhone('+923001234567')).toBe('923001234567')
    expect(normalizePhone('923001234567')).toBe('923001234567')
    expect(normalizePhone('03 00 1234 567')).toBe('923001234567')
  })

  it('returns invalid values untouched', () => {
    expect(normalizePhone('1234567')).toBe('1234567')
  })
})

describe('parseOrderInput', () => {
  it('accepts a valid courier order and normalizes the phone', () => {
    const order = parseOrderInput(orderPayload())
    expect(order.customer_phone).toBe('923001234567')
    expect(order.customer_address).toBe('Karachi, Pakistan')
    expect(order.delivery_method).toBe('courier')
    expect(order.delivery_zone_id).toBe(zoneId)
  })

  it('rejects a courier order without a delivery zone', () => {
    expect(() => parseOrderInput(orderPayload({ delivery_zone_id: '' }))).toThrow(ValidationError)
    expect(() => parseOrderInput(orderPayload({ delivery_zone_id: undefined }))).toThrow(ValidationError)
  })

  it('rejects an invalid delivery zone id', () => {
    expect(() => parseOrderInput(orderPayload({ delivery_zone_id: 'not-a-uuid' }))).toThrow(ValidationError)
  })

  it('rejects a delivery zone on a self-pickup order', () => {
    expect(() =>
      parseOrderInput(orderPayload({ delivery_method: 'self', customer_address: '' }))
    ).toThrow(ValidationError)
  })

  it('accepts a self-pickup order without an address', () => {
    const order = parseOrderInput(
      orderPayload({ delivery_method: 'self', customer_address: '', delivery_zone_id: '' })
    )
    expect(order.customer_address).toBe('')
    expect(order.delivery_method).toBe('self')
    expect(order.delivery_zone_id).toBeUndefined()
  })

  it('rejects a courier order without an address', () => {
    expect(() => parseOrderInput(orderPayload({ customer_address: '' }))).toThrow(ValidationError)
  })

  it('requires a transaction reference and evidence for non-COD payments', () => {
    expect(() => parseOrderInput(orderPayload({ payment_method: 'jazz_cash' }))).toThrow(ValidationError)
    const order = parseOrderInput(
      orderPayload({
        payment_method: 'easypaisa',
        transaction_id: 'TXN-123',
        payment_evidence: 'payment-evidence/650e8400-e29b-41d4-a716-446655440001.png',
      })
    )
    expect(order.transaction_id).toBe('TXN-123')
    expect(order.payment_evidence).toBe('payment-evidence/650e8400-e29b-41d4-a716-446655440001.png')
  })

  it('rejects an invalid evidence key for non-COD payments', () => {
    expect(() =>
      parseOrderInput(
        orderPayload({
          payment_method: 'jazz_cash',
          transaction_id: 'TXN-123',
          payment_evidence: 'https://evil.example.com/screenshot.png',
        })
      )
    ).toThrow(ValidationError)
  })

  it('rejects evidence on a COD order', () => {
    expect(() =>
      parseOrderInput(
        orderPayload({ payment_evidence: 'payment-evidence/650e8400-e29b-41d4-a716-446655440001.png' })
      )
    ).toThrow(ValidationError)
  })

  it('merges duplicate product quantities', () => {
    const order = parseOrderInput(
      orderPayload({
        items: [
          { product_id: productId, quantity: 1 },
          { product_id: productId, quantity: 2 },
        ],
      })
    )
    expect(order.items).toEqual([{ product_id: productId, quantity: 3 }])
  })
})

describe('parseOrderTrackingInput', () => {
  it('normalizes the phone and lowercases the order id', () => {
    const input = parseOrderTrackingInput({ order_id: productId.toUpperCase(), phone: '+923001234567' })
    expect(input.orderId).toBe(productId)
    expect(input.phone).toBe('923001234567')
  })

  it('rejects an invalid order id', () => {
    expect(() => parseOrderTrackingInput({ order_id: 'not-a-uuid', phone: '03001234567' })).toThrow(ValidationError)
  })
})

describe('parseIdempotencyKey', () => {
  it('rejects a missing header', () => {
    expect(() => parseIdempotencyKey(null)).toThrow(ValidationError)
  })

  it('accepts a well-formed key', () => {
    expect(parseIdempotencyKey('order-1234567890-abcdef')).toBe('order-1234567890-abcdef')
  })
})

describe('parsePaymentStatusFilter', () => {
  it('accepts each payment status and the action shortcut', () => {
    expect(parsePaymentStatusFilter('pending')).toBe('pending')
    expect(parsePaymentStatusFilter('paid')).toBe('paid')
    expect(parsePaymentStatusFilter('failed')).toBe('failed')
    expect(parsePaymentStatusFilter('refunded')).toBe('refunded')
    expect(parsePaymentStatusFilter('action')).toBe('action')
  })

  it('returns undefined for missing or empty values', () => {
    expect(parsePaymentStatusFilter(undefined)).toBeUndefined()
    expect(parsePaymentStatusFilter(null)).toBeUndefined()
    expect(parsePaymentStatusFilter('')).toBeUndefined()
    expect(parsePaymentStatusFilter('   ')).toBeUndefined()
  })

  it('rejects unknown statuses and non-strings', () => {
    expect(() => parsePaymentStatusFilter('confirmed')).toThrow(ValidationError)
    expect(() => parsePaymentStatusFilter(123)).toThrow(ValidationError)
  })
})