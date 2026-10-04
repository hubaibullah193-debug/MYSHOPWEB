import { ValidationError, assertUuid } from '@/lib/admin-validation'

const NAME_MAX = 140
const DESC_MAX = 4000
const SEO_MAX = 160
const IMAGE_MAX = 500
const MAX_IMAGES = 12
const MAX_VARIANTS = 50
const PRICE_MAX = 99_999_999
const QUANTITY_MAX = 1_000_000

const URL_RE = /^https?:\/\/.+$/i

export interface SaleWindowInput {
  startsAt?: string | null
  endsAt?: string | null
}

export interface VariantInput {
  id?: string | null
  name: string
  price: number | null
  isActive?: boolean
  stock?: number
}

export interface ProductInput {
  name: string
  description: string
  price: number
  categoryId: string | null
  subcategoryId: string | null
  isActive: boolean
  slug: string | null
  seoTitle: string | null
  seoDescription: string | null
  sale: { price: number | null; startsAt: string | null; endsAt: string | null }
  images: string[]
  variants: VariantInput[]
}

export interface CategoryInput {
  name: string
  slug: string
  parentId: string | null
  isActive: boolean
  displayOrder: number
}

export interface InventoryAdjustInput {
  productId: string
  variantId: string | null
  quantityChange: number
  reason: string
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function parseRequiredText(value: unknown, label: string, max: number, min = 1): string {
  if (typeof value !== 'string') throw new ValidationError(`${label} is required.`)
  const text = value.trim()
  if (text.length < min || text.length > max) {
    throw new ValidationError(`${label} must be ${min}-${max} characters.`)
  }
  return text
}

export function parseOptionalText(value: unknown, label: string, max: number): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new ValidationError(`${label} must be text.`)
  const text = value.trim()
  if (text.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer.`)
  return text.length === 0 ? null : text
}

export function parseMoney(value: unknown, label: string, allowNull = false): number | null {
  if (value === null || value === undefined || value === '') {
    if (allowNull) return null
    throw new ValidationError(`${label} is required.`)
  }
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount) || amount < 0 || amount > PRICE_MAX) {
    throw new ValidationError(`${label} must be between 0 and ${PRICE_MAX.toLocaleString()}.`)
  }
  return roundMoney(amount)
}

export function parseActiveFlag(value: unknown, allowNull = false): boolean {
  if (value === undefined || value === null) {
    if (allowNull) return true
    throw new ValidationError('Availability is required.')
  }
  if (typeof value !== 'boolean') throw new ValidationError('Invalid availability value.')
  return value
}

export function parseOptionalUuid(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null
  return assertUuid(value, label)
}

export function parseOptionalSlug(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new ValidationError('Slug must be text.')
  const slug = value.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new ValidationError('Slug may only contain lowercase letters, numbers and dashes.')
  }
  if (slug.length > 120) throw new ValidationError('Slug must be 120 characters or fewer.')
  return slug
}

export function parseOptionalIsoDate(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new ValidationError(`${label} must be a date.`)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new ValidationError(`Enter a valid ${label}.`)
  return date.toISOString()
}

export function parseSaleWindow(value: unknown): {
  price: number | null
  startsAt: string | null
  endsAt: string | null
} {
  if (value === null || value === undefined) {
    return { price: null, startsAt: null, endsAt: null }
  }
  if (typeof value !== 'object') {
    throw new ValidationError('Sale details are invalid.')
  }
  const raw = value as { price?: unknown; startsAt?: unknown; endsAt?: unknown }
  const price = parseMoney(raw.price, 'Sale price', true)
  const startsAt = parseOptionalIsoDate(raw.startsAt, 'sale start date')
  const endsAt = parseOptionalIsoDate(raw.endsAt, 'sale end date')

  if (price === null) return { price: null, startsAt: null, endsAt: null }

  if (startsAt !== null || endsAt !== null) {
    if (startsAt === null || endsAt === null) {
      throw new ValidationError('Both the sale start and end dates are required for a scheduled sale.')
    }
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      throw new ValidationError('The sale end date must be after the start date.')
    }
  }
  return { price, startsAt, endsAt }
}

export function parseImages(value: unknown): string[] {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) throw new ValidationError('Product images must be a list.')
  if (value.length > MAX_IMAGES) {
    throw new ValidationError(`A product can have at most ${MAX_IMAGES} images.`)
  }
  const seen = new Set<string>()
  const images: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') throw new ValidationError('Each product image must be a URL.')
    const url = entry.trim()
    if (url.length === 0 || url.length > IMAGE_MAX || !URL_RE.test(url)) {
      throw new ValidationError('Each product image must be a valid https/http URL.')
    }
    if (seen.has(url)) throw new ValidationError('A product image appears more than once.')
    seen.add(url)
    images.push(url)
  }
  return images
}

export function parseVariant(value: unknown, index: number): VariantInput {
  if (value === null || value === undefined || typeof value !== 'object') {
    throw new ValidationError(`Variant #${index + 1} is invalid.`)
  }
  const raw = value as { id?: unknown; name?: unknown; price?: unknown; isActive?: unknown; stock?: unknown }
  const id = raw.id === null || raw.id === undefined || raw.id === '' ? undefined : assertUuid(raw.id, 'variant')
  const name = parseRequiredText(raw.name, `Variant #${index + 1} name`, 100)
  const price = parseMoney(raw.price, `Variant #${index + 1} price`, true)
  const stock = parseQuantity(raw.stock, `Variant #${index + 1} stock`, true)
  return {
    id,
    name,
    price,
    isActive: parseActiveFlag(raw.isActive, true),
    stock: stock ?? 0,
  }
}

export function parseVariants(value: unknown): VariantInput[] {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) throw new ValidationError('Variants must be a list.')
  if (value.length > MAX_VARIANTS) throw new ValidationError(`A product can have at most ${MAX_VARIANTS} variants.`)
  const variants = value.map((entry, idx) => parseVariant(entry, idx))
  const names = new Set<string>()
  for (const variant of variants) {
    const key = variant.name.toLowerCase()
    if (names.has(key)) throw new ValidationError('Each variant name must be unique.')
    names.add(key)
  }
  return variants
}

export function parseProductPayload(body: unknown): ProductInput {
  if (body === null || typeof body !== 'object') throw new ValidationError('Product details are required.')
  const record = body as Partial<ProductInput>

  const saleRaw = (record as { sale?: unknown }).sale
  const price = parseMoney(record.price, 'Price', false) as number
  if (price <= 0) throw new ValidationError('Price must be greater than 0.')

  return {
    name: parseRequiredText(record.name, 'Product name', NAME_MAX),
    description: parseOptionalText(record.description, 'Product description', DESC_MAX) ?? '',
    price,
    categoryId: parseOptionalUuid(record.categoryId, 'category'),
    subcategoryId: parseOptionalUuid(record.subcategoryId, 'subcategory'),
    isActive: parseActiveFlag(record.isActive, true),
    slug: parseOptionalSlug(record.slug),
    seoTitle: parseOptionalText(record.seoTitle, 'SEO title', SEO_MAX),
    seoDescription: parseOptionalText(record.seoDescription, 'SEO description', SEO_MAX),
    sale: parseSaleWindow(saleRaw),
    images: parseImages(record.images),
    variants: parseVariants(record.variants),
  }
}

export function parseQuantity(value: unknown, label: string, allowNull = false): number | null {
  if (value === null || value === undefined || value === '') {
    if (allowNull) return null
    throw new ValidationError(`${label} is required.`)
  }
  const quantity = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > QUANTITY_MAX) {
    throw new ValidationError(`${label} must be a whole number between 0 and ${QUANTITY_MAX.toLocaleString()}.`)
  }
  return quantity
}

export function parseInventoryAdjust(payload: unknown): InventoryAdjustInput {
  if (payload === null || typeof payload !== 'object') {
    throw new ValidationError('Inventory adjustment details are required.')
  }
  const body = payload as {
    productId?: unknown
    variantId?: unknown
    quantityChange?: unknown
    reason?: unknown
  }
  const productId = assertUuid(body.productId, 'product')
  const variantId = parseOptionalUuid(body.variantId, 'variant')
  const reason = parseRequiredText(body.reason, 'Adjustment reason', 255)
  const quantityChange = typeof body.quantityChange === 'number' ? body.quantityChange : Number(body.quantityChange)
  if (!Number.isInteger(quantityChange)) {
    throw new ValidationError('The stock change must be a whole number (use a negative value to reduce stock).')
  }
  if (Math.abs(quantityChange) < 1 || Math.abs(quantityChange) > QUANTITY_MAX) {
    throw new ValidationError('The stock change must be between 1 and 1,000,000.')
  }
  return { productId, variantId, quantityChange, reason }
}

export function parseCategoryPayload(body: unknown): CategoryInput {
  if (body === null || typeof body !== 'object') throw new ValidationError('Category details are required.')
  const record = body as Partial<CategoryInput>
  const name = parseRequiredText(record.name, 'Category name', 80)
  const slug = parseOptionalSlug(record.slug)
  const parentId = record.parentId === '' ? null : parseOptionalUuid(record.parentId, 'parent category')
  const displayOrder = parseDisplayOrder(record.displayOrder)

  return {
    name,
    slug: slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    parentId,
    isActive: parseActiveFlag(record.isActive, true),
    displayOrder,
  }
}

export function parseDisplayOrder(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0
  const order = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(order) || order < -1000 || order > 10000) {
    throw new ValidationError('Display order must be a number between -1000 and 10000.')
  }
  return order
}

/**
 * Display-side mirror of the database STABLE function public.current_price().
 * The authoritative price for order totals is always computed by the database;
 * this helper is used only for rendering (cards, product pages, admin tables).
 */
export function isOnSale(
  product: Pick<ProductInput, 'sale'> & { price: number }
): boolean {
  const sale = product.sale
  if (sale.price === null) return false
  if (sale.startsAt !== null && new Date(sale.startsAt).getTime() > Date.now()) return false
  if (sale.endsAt !== null && new Date(sale.endsAt).getTime() < Date.now()) return false
  return true
}

export function effectivePrice(
  product: Pick<ProductInput, 'sale'> & { price: number }
): number {
  return isOnSale(product) ? (product.sale.price as number) : product.price
}