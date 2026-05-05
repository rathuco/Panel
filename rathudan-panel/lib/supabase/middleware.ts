import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

// Rol hiyerarşisi — sayısal değer yükseldikçe yetki artar
const ROLE_LEVEL: Record<UserRole, number> = {
  client: 1,
  employee: 2,
  admin: 3,
  super_admin: 4,
}

// Route → minimum gerekli rol
const PROTECTED_ROUTES: { path: string; minRole: UserRole }[] = [
  { path: '/admin', minRole: 'super_admin' },
  { path: '/reports', minRole: 'admin' },
  { path: '/finance/transactions', minRole: 'admin' },
  { path: '/finance/invoices', minRole: 'admin' },
  { path: '/crm/clients', minRole: 'employee' },
  { path: '/packages', minRole: 'employee' },
  { path: '/projects', minRole: 'employee' },
  { path: '/meetings', minRole: 'employee' },
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

  // Giriş yapmamış kullanıcıyı login'e yönlendir
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Giriş yapmış kullanıcıyı auth/root sayfalarından dashboard'a yönlendir
  if (user && (isAuthPage || isRootPage)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Rol kontrolü — sadece giriş yapmış kullanıcılar için
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

      // Pasif kullanıcıyı login'e at
      if (!profile || !profile.is_active) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        return NextResponse.redirect(url)
      }

      const userLevel = ROLE_LEVEL[profile.role as UserRole] ?? 0
      const requiredLevel = ROLE_LEVEL[matchedRoute.minRole]

      // Yetersiz rol → dashboard'a yönlendir
      if (userLevel < requiredLevel) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
