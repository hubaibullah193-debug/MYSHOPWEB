export interface OrderItemInput {
  product_id: string
  quantity: number
}

export type OrderStatus =
  | 'pending_payment'
  | 'received'
  | 'processing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export interface OrderInput {
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  items: OrderItemInput[]
  payment_method: 'cod' | 'jazz_cash' | 'easypaisa'
  delivery_method: 'courier' | 'self'
  transaction_id?: string
  payment_evidence?: string
  delivery_zone_id?: string
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^(?:\+92|0|92)3\d{8,9}$/
const evidenceKeyPattern = /^payment-evidence\/[0-9a-fA-F-]{36}\.(png|jpe?g|webp)$/

export function normalizePhone(value: string): string {
  const compact = value.replace(/\s/g, '')
  if (!phonePattern.test(compact)) {
    return compact
  }
  if (compact.startsWith('+')) {
    const digits = compact.slice(1)
    return digits.startsWith('92') ? digits : `92${digits}`
  }
  if (compact.startsWith('0')) {
    return `92${compact.slice(1)}`
  }
  if (compact.startsWith('92')) {
    return compact
  }
  return `92${compact}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} is required`)
  }

  const normalized = value.trim()
  if (!normalized) {
    throw new ValidationError(`${field} is required`)
  }
  if (normalized.length > maxLength) {
    throw new ValidationError(`${field} is too long`)
  }
  return normalized
}

function optionalText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return requiredText(value, field, maxLength)
}

export function isValidEmail(value: string): boolean {
  return emailPattern.test(value.trim())
}

export function isValidPhone(value: string): boolean {
  return phonePattern.test(value.replace(/\s/g, ''))
}

export function isValidUuid(value: string): boolean {
  return uuidPattern.test(value)
}

export function parseOrderInput(value: unknown): OrderInput {
  if (!isRecord(value)) {
    throw new ValidationError('Invalid order data')
  }

  const customerName = requiredText(value.customer_name, 'Name', 120)
  const customerEmail = requiredText(value.customer_email, 'Email', 254).toLowerCase()
  const customerPhone = normalizePhone(requiredText(value.customer_phone, 'WhatsApp number', 20))
  const paymentMethod = value.payment_method
  const deliveryMethod = value.delivery_method ?? 'courier'
  const transactionId = optionalText(value.transaction_id, 'Transaction reference', 128)
  const paymentEvidence = optionalText(value.payment_evidence, 'Payment screenshot', 500)
  const rawAddress = typeof value.customer_address === 'string' ? value.customer_address.trim() : ''

  if (!isValidEmail(customerEmail)) {
    throw new ValidationError('Enter a valid email address')
  }
  if (!isValidPhone(customerPhone)) {
    throw new ValidationError('Enter a valid WhatsApp number')
  }
  if (!['cod', 'jazz_cash', 'easypaisa'].includes(String(paymentMethod))) {
    throw new ValidationError('Select a valid payment method')
  }
  if (paymentMethod !== 'cod' && !transactionId) {
    throw new ValidationError('Enter the payment transaction reference')
  }
  if (paymentMethod !== 'cod' && (!paymentEvidence || !evidenceKeyPattern.test(paymentEvidence))) {
    throw new ValidationError('Attach the payment screenshot')
  }
  if (paymentMethod === 'cod' && paymentEvidence) {
    throw new ValidationError('COD orders cannot include a payment screenshot')
  }
  if (!['courier', 'self'].includes(String(deliveryMethod))) {
    throw new ValidationError('Select a valid delivery method')
  }
  const deliveryZoneId = value.delivery_zone_id === undefined || value.delivery_zone_id === null || value.delivery_zone_id === ''
    ? undefined
    : requiredText(value.delivery_zone_id, 'Delivery zone', 64)
  if (deliveryZoneId !== undefined && !isValidUuid(deliveryZoneId)) {
    throw new ValidationError('Select a valid delivery zone')
  }
  if (deliveryMethod === 'courier') {
    if (!deliveryZoneId) {
      throw new ValidationError('Select a delivery zone')
    }
  } else if (deliveryZoneId) {
    throw new ValidationError('Shop pickup does not use a delivery zone')
  }
  let customerAddress = rawAddress
  if (deliveryMethod === 'courier') {
    customerAddress = requiredText(rawAddress, 'Delivery address', 500)
  } else if (customerAddress.length > 500) {
    throw new ValidationError('Delivery address is too long')
  }
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 50) {
    throw new ValidationError('Order must contain between 1 and 50 items')
  }

  const quantities = new Map<string, number>()
  for (const item of value.items) {
    if (!isRecord(item)) {
      throw new ValidationError('Invalid order item')
    }
    const productId = requiredText(item.product_id, 'Product', 64)
    if (!isValidUuid(productId)) {
      throw new ValidationError('Invalid product')
    }
    const quantity = item.quantity
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new ValidationError('Invalid product quantity')
    }
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity)
  }

  const items = [...quantities.entries()].map(([productId, quantity]) => ({
    product_id: productId,
    quantity,
  }))

  return {
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    items,
    payment_method: paymentMethod as OrderInput['payment_method'],
    delivery_method: deliveryMethod as OrderInput['delivery_method'],
    transaction_id: transactionId,
    payment_evidence: paymentEvidence,
    delivery_zone_id: deliveryZoneId,
  }
}

export function parseOrderTrackingInput(value: unknown): { orderId: string; phone: string } {
  if (!isRecord(value)) {
    throw new ValidationError('Invalid tracking request')
  }

  const orderId = requiredText(value.order_id, 'Order ID', 64).toLowerCase()
  const phone = requiredText(value.phone, 'WhatsApp number', 20)

  if (!isValidUuid(orderId)) {
    throw new ValidationError('Invalid order ID')
  }
  if (!isValidPhone(phone)) {
    throw new ValidationError('Enter the WhatsApp number used for the order')
  }

  return { orderId, phone: normalizePhone(phone) }
}

export function parseIdempotencyKey(value: string | null): string {
  if (!value) {
    throw new ValidationError('Idempotency-Key header is required')
  }
  const key = value.trim()
  if (key.length < 16 || key.length > 128) {
    throw new ValidationError('Invalid idempotency key')
  }
  return key
}

export function parseSearch(value: unknown, maxLength = 120): string | undefined {
  return optionalText(value, 'Search', maxLength)
}

export function parsePositiveInteger(value: unknown, fallback: number, maximum = 100): number {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new ValidationError('Invalid limit')
  }
  return parsed
}

export function isValidRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}

export function parseOrderStatus(value: unknown): OrderStatus {
  const statuses: OrderStatus[] = [
    'pending_payment',
    'received',
    'processing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ]
  if (typeof value !== 'string' || !statuses.includes(value as OrderStatus)) {
    throw new ValidationError('Invalid order status')
  }
  return value as OrderStatus
}

export function parseAdminNotes(value: unknown, maxLength = 1000): string | null {
  if (value === undefined || value === null || value === '') return null
  return requiredText(value, 'Notes', maxLength)
}

export function parsePaymentAction(value: unknown): 'confirm' | 'fail' | 'refund' {
  if (value !== 'confirm' && value !== 'fail' && value !== 'refund') {
    throw new ValidationError('Invalid payment action')
  }
  return value
}

export function parseDeliveryDate(value: unknown): string {
  const date = requiredText(value, 'Delivery date', 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError('Invalid delivery date')
  }
  return date
}

export function parseDeliveryTimeSlot(value: unknown): string {
  return requiredText(value, 'Delivery time slot', 80)
}

export function parseOptionalUuid(value: unknown, field = 'ID'): string | null {
  if (value === undefined || value === null || value === '') return null
  const id = requiredText(value, field, 64)
  if (!isValidUuid(id)) {
    throw new ValidationError(`Invalid ${field}`)
  }
  return id
}
