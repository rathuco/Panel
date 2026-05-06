import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

const ROLE_LEVEL: Record<UserRole, number> = {
  client: 1,
  employee: 2,
  admin: 3,
  super_admin: 4,
}

const PROTECTED_ROUTES: { path: string; minRole: UserRole }[] = [
  { path: '/admin', minRole: 'super_admin' },
  { path: '/reports', minRole: 'admin' },
  { path: '/finance/transactions', minRole: 'admin' },
  { path: '/finance/invoices', minRole: 'client' },   // müşteri erişebilir
  { path: '/crm/clients', minRole: 'employee' },
  { path: '/packages', minRole: 'client' },            // müşteri erişebilir
  { path: '/projects', minRole: 'employee' },
  { path: '/meetings', minRole: 'employee' },
  { path: '/crm/tickets', minRole: 'client' },         // müşteri erişebilir
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }: any) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isRootPage = request.nextUrl.pathname === '/'

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && (isAuthPage || isRootPage)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user) {
    const matchedRoute = PROTECTED_ROUTES.find(route =>
      request.nextUrl.pathname.startsWith(route.path)
    )

    if (matchedRoute) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (!profile || !profile.is_active) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        return NextResponse.redirect(url)
      }

      const userLevel = ROLE_LEVEL[profile.role as UserRole] ?? 0
      const requiredLevel = ROLE_LEVEL[matchedRoute.minRole]

      if (userLevel < requiredLevel) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
