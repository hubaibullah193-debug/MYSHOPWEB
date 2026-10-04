import { getAuthToken } from './auth'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = await getAuthToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, { ...init, headers })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : 'Request failed'
    throw new ApiError(message, response.status)
  }

  return payload as T
}
