import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdminRole, isSuperAdminRole, type UserRole } from '@/lib/admin-permissions'

const ADMIN_PUBLIC_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password']

export async function middleware(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })
  const pathname = request.nextUrl.pathname

  if (ADMIN_PUBLIC_PATHS.includes(pathname)) {
    return response
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role,is_active')
    .eq('id', session.user.id)
    .single()

  if (!profile || !profile.is_active || !isAdminRole(profile.role as UserRole)) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (
    pathname.startsWith('/admin/settings/staff') &&
    !isSuperAdminRole(profile.role as UserRole)
  ) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}