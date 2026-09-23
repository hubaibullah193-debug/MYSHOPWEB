import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Fetch user role
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || !['admin_staff', 'super_admin', 'owner'].includes(user.role)) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Protect shop routes (customer-only)
  if (request.nextUrl.pathname.startsWith('/shop')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (user && user.role !== 'customer') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/shop/:path*'],
}
