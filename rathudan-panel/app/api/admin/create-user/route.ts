import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Mevcut kullanıcının yetkisini kontrol et
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Yetersiz yetki' }, { status: 403 })
    }

    // Service role ile admin client oluştur
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await request.json()
    const { email, password, full_name, role, phone, department, company_name, city, tax_number, notes } = body

    // Admin API ile kullanıcı oluştur — mevcut oturumu etkilemez
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (newUser.user) {
      // Profiles tablosuna ekle
      const { error: profileError } = await adminSupabase.from('profiles').upsert({
        id: newUser.user.id,
        email,
        full_name,
        role,
        phone: phone || null,
        department: department || null,
        is_active: true,
      }, { onConflict: 'id' })

      if (profileError) {
        console.error('Profile error:', profileError)
      }

      // Müşteri ise clients tablosuna da ekle
      if (role === 'client' && company_name) {
        const { error: clientError } = await adminSupabase.from('clients').insert({
          company_name,
          contact_name: full_name,
          email,
          phone: phone || null,
          city: city || null,
          tax_number: tax_number || null,
          notes: notes || null,
          is_active: true,
        })

        if (clientError) {
          console.error('Client error:', clientError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
