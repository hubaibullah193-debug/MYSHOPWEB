import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const cookieChunkSize = 3180

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${encodeURIComponent(name)}=`
  const value = document.cookie.split('; ').find((entry) => entry.startsWith(prefix))
  return value ? decodeURIComponent(value.slice(prefix.length)) : null
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=315360000; SameSite=Lax${secure}`
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`
}

function decodeCookieValue(value: string): string | null {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return value
    const [accessToken, refreshToken, providerToken, providerRefreshToken, factors] = parsed as string[]
    if (!accessToken) return null
    const payloadPart = accessToken.split('.')[1]
    if (!payloadPart || typeof atob === 'undefined') return null
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (character) => character.charCodeAt(0)))) as Record<string, unknown>
    const { exp, sub, ...user } = payload
    return JSON.stringify({
      expires_at: exp,
      expires_in: Number(exp) - Math.round(Date.now() / 1000),
      token_type: 'bearer',
      access_token: accessToken,
      refresh_token: refreshToken,
      provider_token: providerToken,
      provider_refresh_token: providerRefreshToken,
      user: { id: sub, factors, ...user },
    })
  } catch {
    return null
  }
}

const cookieStorage = {
  getItem(key: string): string | null {
    const value = readCookie(key)
    if (value) return decodeCookieValue(value)
    const chunks: string[] = []
    for (let index = 0; ; index += 1) {
      const chunk = readCookie(`${key}.${index}`)
      if (!chunk) break
      chunks.push(chunk)
    }
    return chunks.length ? decodeCookieValue(chunks.join('')) : null
  },
  setItem(key: string, value: string): void {
    this.removeItem(key)
    for (let index = 0; index * cookieChunkSize < value.length; index += 1) {
      writeCookie(index === 0 ? key : `${key}.${index}`, value.slice(index * cookieChunkSize, (index + 1) * cookieChunkSize))
    }
  },
  removeItem(key: string): void {
    deleteCookie(key)
    for (let index = 0; ; index += 1) {
      const chunkName = `${key}.${index}`
      if (!readCookie(chunkName)) break
      deleteCookie(chunkName)
    }
  },
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: typeof window === 'undefined' ? undefined : cookieStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

