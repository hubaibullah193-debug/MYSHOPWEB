import {
  effectivePrice,
  isOnSale,
  parseCategoryPayload,
  parseInventoryAdjust,
  parseMoney,
  parseProductPayload,
  parseSaleWindow,
  parseVariants,
  roundMoney,
} from '@/lib/product-validation'

describe('product-validation', () => {
  describe('roundMoney', () => {
    it('rounds to two decimals', () => {
      expect(roundMoney(10.005)).toBe(10.01)
      expect(roundMoney(19.999)).toBe(20)
      expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    })
  })

  describe('parseMoney', () => {
    it('accepts valid amounts as number or string', () => {
      expect(parseMoney(1299.5, 'Price')).toBe(1299.5)
      expect(parseMoney('49.99', 'Price')).toBe(49.99)
      expect(parseMoney(0, 'Price', true)).toBe(0)
    })

    it('allows null when allowed', () => {
      expect(parseMoney(null, 'Sale price', true)).toBeNull()
      expect(parseMoney('', 'Sale price', true)).toBeNull()
    })

    it('rejects missing value when required', () => {
      expect(() => parseMoney(undefined, 'Price')).toThrow('required')
    })

    it('rejects negative, non-finite and oversized amounts', () => {
      expect(() => parseMoney(-1, 'Price')).toThrow()
      expect(() => parseMoney(Number.NaN, 'Price')).toThrow()
      expect(() => parseMoney(Infinity, 'Price')).toThrow()
      expect(() => parseMoney(100_000_000, 'Price')).toThrow('between')
      expect(() => parseMoney('abc', 'Price')).toThrow()
    })
  })

  describe('parseSaleWindow', () => {
    it('returns an empty window when there is no sale price', () => {
      expect(parseSaleWindow({ price: null })).toEqual({ price: null, startsAt: null, endsAt: null })
    })

    it('accepts an always-on sale (price only)', () => {
      const window = parseSaleWindow({ price: 999, startsAt: null, endsAt: null })
      expect(window.price).toBe(999)
      expect(window.startsAt).toBeNull()
      expect(window.endsAt).toBeNull()
    })

    it('accepts a bounded sale window', () => {
      const window = parseSaleWindow({ price: 999, startsAt: '2026-01-01T00:00:00Z', endsAt: '2026-12-31T00:00:00Z' })
      expect(window.price).toBe(999)
      expect(window.endsAt).toBe('2026-12-31T00:00:00.000Z')
    })

    it('rejects a sale with only one bound', () => {
      expect(() => parseSaleWindow({ price: 999, startsAt: '2026-01-01', endsAt: null })).toThrow('Both')
    })

    it('rejects an end before the start', () => {
      expect(() =>
        parseSaleWindow({ price: 999, startsAt: '2026-12-01', endsAt: '2026-01-01' }),
      ).toThrow('after the start')
    })

    it('rejects invalid payloads', () => {
      expect(() => parseSaleWindow('sale')).toThrow()
      expect(() => parseSaleWindow({ price: 'nope' })).toThrow()
    })
  })

  describe('parseVariants', () => {
    it('accepts valid variants', () => {
      const variants = parseVariants([
        { name: 'Small', price: null, stock: 5 },
        { name: 'Large', price: 1499, isActive: true },
      ])
      expect(variants).toHaveLength(2)
      expect(variants[0].stock).toBe(5)
      expect(variants[1].price).toBe(1499)
    })

    it('returns an empty list for null or empty', () => {
      expect(parseVariants(null)).toEqual([])
      expect(parseVariants([])).toEqual([])
    })

    it('allows zero stock with a missing price', () => {
      const variants = parseVariants([{ name: 'Red', price: null, stock: 0 }])
      expect(variants[0].stock).toBe(0)
      expect(variants[0].price).toBeNull()
    })

    it('rejects duplicate variant names', () => {
      expect(() => parseVariants([{ name: 'Red' }, { name: ' red ' }])).toThrow('unique')
    })

    it('rejects empty names and malformed entries', () => {
      expect(() => parseVariants([{ name: '' }])).toThrow('1-100 characters')
      expect(() => parseVariants('not-a-list')).toThrow()
    })
  })

  describe('parseProductPayload', () => {
    it('accepts a fully valid product', () => {
      const product = parseProductPayload({
        name: '  Wireless Mouse  ',
        description: 'A mouse.',
        price: 1999.5,
        categoryId: '6f34c5a0-6f34-4a1b-8a2c-000000000001',
        subcategoryId: null,
        isActive: true,
        slug: 'Wireless-Mouse',
        seoTitle: 'Wireless Mouse',
        seoDescription: 'buy',
        sale: { price: 1499, startsAt: null, endsAt: null },
        images: ['https://example.com/a.png'],
        variants: [],
      })
      expect(product.name).toBe('Wireless Mouse')
      expect(product.price).toBe(1999.5)
      expect(product.slug).toBe('wireless-mouse')
      expect(product.sale.price).toBe(1499)
    })

    it('rejects a zero or missing base price', () => {
      expect(() =>
        parseProductPayload({ name: 'X', price: 0 }),
      ).toThrow('greater than 0')
      expect(() => parseProductPayload({ name: 'X' })).toThrow('required')
    })

    it('rejects a missing name', () => {
      expect(() => parseProductPayload({ price: 100 })).toThrow('required')
    })

    it('rejects malformed urls in images', () => {
      expect(() =>
        parseProductPayload({ name: 'X', price: 100, images: ['/local.png'] }),
      ).toThrow('valid https/http URL')
    })

    it('rejects invalid requests', () => {
      expect(() => parseProductPayload(null)).toThrow('required')
    })
  })

  describe('parseInventoryAdjust', () => {
    it('accepts a valid adjustment', () => {
      const adjustment = parseInventoryAdjust({
        productId: '6f34c5a0-6f34-4a1b-8a2c-000000000001',
        variantId: null,
        quantityChange: -3,
        reason: 'damaged',
      })
      expect(adjustment.quantityChange).toBe(-3)
      expect(adjustment.variantId).toBeNull()
    })

    it('rejects a zero change and oversized changes', () => {
      expect(() =>
        parseInventoryAdjust({ productId: '6f34c5a0-6f34-4a1b-8a2c-000000000001', quantityChange: 0, reason: 'count' }),
      ).toThrow('between')
      expect(() =>
        parseInventoryAdjust({ productId: '6f34c5a0-6f34-4a1b-8a2c-000000000001', quantityChange: 2_000_000, reason: 'count' }),
      ).toThrow('between')
    })

    it('rejects missing or invalid product id', () => {
      expect(() => parseInventoryAdjust({ quantityChange: 5 })).toThrow()
      expect(() => parseInventoryAdjust({ productId: 'nope', quantityChange: 5 })).toThrow()
    })

    it('rejects non-integer changes', () => {
      expect(() =>
        parseInventoryAdjust({ productId: '6f34c5a0-6f34-4a1b-8a2c-000000000001', quantityChange: 1.5, reason: 'count' }),
      ).toThrow('whole number')
    })
  })

  describe('effectivePrice / isOnSale', () => {
    const base = { sale: { price: null as number | null, startsAt: null, endsAt: null }, price: 100 }
    it('returns the base price when there is no sale', () => {
      expect(isOnSale(base)).toBe(false)
      expect(effectivePrice(base)).toBe(100)
    })

    it('applies an always-on sale', () => {
      const onSale = { price: 100, sale: { price: 80, startsAt: null, endsAt: null } }
      expect(isOnSale(onSale)).toBe(true)
      expect(effectivePrice(onSale)).toBe(80)
    })

    it('ignores a sale before it starts and after it ends', () => {
      const future = { price: 100, sale: { price: 80, startsAt: '2030-01-01T00:00:00Z', endsAt: null } }
      const past = { price: 100, sale: { price: 80, startsAt: null, endsAt: '2020-01-01T00:00:00Z' } }
      expect(isOnSale(future)).toBe(false)
      expect(isOnSale(past)).toBe(false)
      expect(effectivePrice(future)).toBe(100)
      expect(effectivePrice(past)).toBe(100)
    })

    it('applies a sale inside its window', () => {
      const live = { price: 100, sale: { price: 75, startsAt: '2000-01-01T00:00:00Z', endsAt: '2099-01-01T00:00:00Z' } }
      expect(isOnSale(live)).toBe(true)
      expect(effectivePrice(live)).toBe(75)
    })
  })

  describe('parseCategoryPayload', () => {
    it('accepts a valid category and derives a slug when missing', () => {
      const category = parseCategoryPayload({ name: '  Mobile Phones  ' })
      expect(category.name).toBe('Mobile Phones')
      expect(category.slug).toBe('mobile-phones')
      expect(category.parentId).toBeNull()
    })

    it('accepts a parent id and keeps it on an empty string', () => {
      const category = parseCategoryPayload({
        name: 'Phones',
        parentId: '',
        isActive: false,
        displayOrder: 5,
      })
      expect(category.parentId).toBeNull()
      expect(category.isActive).toBe(false)
      expect(category.displayOrder).toBe(5)
    })

    it('rejects invalid slugs and payloads', () => {
      expect(() => parseCategoryPayload({ name: 'X', slug: 'bad slug!' })).toThrow()
      expect(() => parseCategoryPayload(null)).toThrow()
    })
  })
})