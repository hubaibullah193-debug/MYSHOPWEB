import { isValidAssignableRole, type UserRole } from '@/lib/admin-permissions'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function normalizePhone(value: string | null | undefined): string | null {
  const digits = (value ?? '').trim()
  if (!digits) return null
  const normalized = digits.replace(/[\s\-().]/g, '')
  return /^\+?\d{7,15}$/.test(normalized) ? normalized : digits
}

export function parseAdminEmail(value: string): string {
  const email = (value ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    throw new ValidationError('Enter a valid email address.')
  }
  return email
}

export function parseAdminName(value: string): string {
  const name = (value ?? '').trim()
  if (name.length < 2 || name.length > 120) {
    throw new ValidationError('Enter the person\'s name (2-120 characters).')
  }
  return name
}

export function parseAdminPhone(value: string | null | undefined): string | null {
  const normalized = normalizePhone(value)
  if (normalized === null) return null
  if (!/^\+?\d{7,15}$/.test(normalized)) {
    throw new ValidationError('Enter a valid phone number, or leave it empty.')
  }
  return normalized
}

export function parsePassword(value: string): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new ValidationError('Passwords must be 8-128 characters.')
  }
  return value
}

export function parseAdminRole(value: string): UserRole {
  if (!isValidAssignableRole(value as UserRole)) {
    throw new ValidationError('Invalid role. You can only assign admin_staff or super_admin.')
  }
  return value as UserRole
}

export function parseAdminActive(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError('Invalid status value.')
  }
  return value
}

export function parseResetMode(value: string): 'link' | 'temp' {
  if (value !== 'link' && value !== 'temp') {
    throw new ValidationError('Invalid reset mode.')
  }
  return value
}