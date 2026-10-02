interface RateEntry {
  count: number
  resetAt: number
}

const entries = new Map<string, RateEntry>()

export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  const current = entries.get(key)

  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (current.count >= limit) {
    throw new Error('Too many requests')
  }

  current.count += 1
}

export function requestAddress(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
