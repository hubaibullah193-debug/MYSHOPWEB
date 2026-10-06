/**
 * Single source of truth for store contact details used by public pages.
 * The shop WhatsApp number is configured via NEXT_PUBLIC_WHATSAPP_NUMBER
 * (e.g. 0300XXXXXXX, +92300XXXXXXX or 92300XXXXXXX).
 */

export function normalizeWhatsappNumber(value: string | null | undefined): string | null {
  if (!value) return null
  const compact = value.trim().replace(/^\+/, '').replace(/[\s\-().]/g, '')
  let match = compact.match(/^92(3\d{8,9})$/)
  if (match) return `92${match[1]}`
  match = compact.match(/^0(3\d{8,9})$/)
  if (match) return `92${match[1]}`
  match = compact.match(/^3\d{8,9}$/)
  if (match) return `92${match[0]}`
  return null
}

export function whatsappNumber(): string | null {
  return normalizeWhatsappNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER)
}

/**
 * Click-to-chat URL (https://wa.me/<number>?text=...). Returns null when no
 * shop WhatsApp number is configured so callers can fall back to the contact
 * page instead of rendering a dead link.
 */
export function whatsappLink(message?: string): string | null {
  const number = whatsappNumber()
  if (!number) return null
  const url = new URL(`https://wa.me/${number}`)
  if (message) url.searchParams.set('text', message)
  return url.toString()
}