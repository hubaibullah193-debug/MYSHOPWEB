interface RateEntry {
  count: number
  resetAt: number
}

function getGlobalStore(): Map<string, RateEntry> {
  const globalScope = globalThis as typeof globalThis & {
    __hubaibRateLimitStore?: Map<string, RateEntry>
  }
  if (!globalScope.__hubaibRateLimitStore) {
    globalScope.__hubaibRateLimitStore = new Map<string, RateEntry>()
  }
  return globalScope.__hubaibRateLimitStore
}

export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const store = getGlobalStore()
  const now = Date.now()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
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
