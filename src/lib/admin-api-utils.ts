import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ValidationError } from '@/lib/admin-validation'
import { ServerAuthError } from '@/lib/supabase-server'

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof ServerAuthError) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status, headers: { 'Cache-Control': 'no-store' } }
    )
  }
  if (err instanceof ValidationError) {
    return NextResponse.json(
      { error: err.message },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    )
  }
  if (err instanceof Error && err.message === 'Too many requests') {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Cache-Control': 'no-store' } }
    )
  }
  return NextResponse.json(
    { error: 'Unexpected error' },
    { status: 500, headers: { 'Cache-Control': 'no-store' } }
  )
}

const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'

export function generateTempPassword(length = 16): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => TEMP_PASSWORD_ALPHABET[b % TEMP_PASSWORD_ALPHABET.length]).join('')
}

export function requestOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    'localhost:3000'
  return `${proto}://${host}`
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function assertUuid(value: unknown, label = 'id'): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new ValidationError(`Invalid ${label}.`)
  }
  return value
}