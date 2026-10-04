import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ValidationError } from '@/lib/admin-validation'
import { ServerAuthError } from '@/lib/supabase-server'

export { assertUuid } from '@/lib/admin-validation'

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

const SAFE_RPC_MESSAGES = new Set([
  'Admin access required',
  'Invalid product name',
  'Invalid product price',
  'Invalid sale price',
  'Invalid category',
  'Invalid subcategory',
  'Category and subcategory do not match',
  'Product not found',
  'Invalid variant name',
  'Invalid variant price',
  'Invalid variant stock',
  'Invalid variant reference',
  'Invalid variant',
  'Transfer the base stock to a variant before adding variants',
  'This product uses variants — adjust a specific variant instead',
  'Insufficient existing stock',
  'A reason is required',
])

/** Maps a surfaced Supabase RPC error to a safe client-facing message. */
export function rpcMessage(error: { message?: string } | null | undefined, fallback: string): string {
  const message = error?.message
  return message && SAFE_RPC_MESSAGES.has(message) ? message : fallback
}