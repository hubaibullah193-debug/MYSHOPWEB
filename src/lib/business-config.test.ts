import { normalizeWhatsappNumber, whatsappNumber, whatsappLink } from '@/lib/business-config'

const originalNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER

afterEach(() => {
  if (originalNumber === undefined) {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  } else {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = originalNumber
  }
})

describe('normalizeWhatsappNumber', () => {
  it('accepts local, international and already-normalized formats', () => {
    expect(normalizeWhatsappNumber('03001234567')).toBe('923001234567')
    expect(normalizeWhatsappNumber('+923001234567')).toBe('923001234567')
    expect(normalizeWhatsappNumber('923001234567')).toBe('923001234567')
    expect(normalizeWhatsappNumber('03 00 1234 567')).toBe('923001234567')
    expect(normalizeWhatsappNumber('+92 300-1234567')).toBe('923001234567')
  })

  it('returns null for missing or invalid values', () => {
    expect(normalizeWhatsappNumber(null)).toBeNull()
    expect(normalizeWhatsappNumber(undefined)).toBeNull()
    expect(normalizeWhatsappNumber('')).toBeNull()
    expect(normalizeWhatsappNumber('abc')).toBeNull()
    expect(normalizeWhatsappNumber('0310')).toBeNull()
    expect(normalizeWhatsappNumber('13001234567')).toBeNull()
  })
})

describe('whatsappLink', () => {
  it('returns null when no number is configured', () => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    expect(whatsappNumber()).toBeNull()
    expect(whatsappLink()).toBeNull()
    expect(whatsappLink('Hello')).toBeNull()
  })

  it('builds a wa.me link with an optional prefilled message', () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '03001234567'
    expect(whatsappLink()).toBe('https://wa.me/923001234567')
    const withMessage = whatsappLink('I need help with my order')
    expect(withMessage).not.toBeNull()
    const url = new URL(withMessage as string)
    expect(url.protocol).toBe('https:')
    expect(url.hostname).toBe('wa.me')
    expect(url.pathname).toBe('/923001234567')
    expect(url.searchParams.get('text')).toBe('I need help with my order')
  })
})