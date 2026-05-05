import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Plus, Building2, Phone, Mail, MapPin, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default async function ClientsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, assigned_employee:profiles(full_name)')
    .order('created_at', { ascending: false })

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin'

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-red" />
            Müşteriler
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">{clients?.length || 0} müşteri kayıtlı</p>
        </div>
        {isAdmin && (
          <Link href="/crm/clients/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Yeni Müşteri
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-black-border">
                <th className="table-header text-left px-4 py-3">Firma</th>
                <th className="table-header text-left px-4 py-3 hidden md:table-cell">İletişim</th>
                <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Şehir</th>
                <th className="table-header text-left px-4 py-3 hidden xl:table-cell">Sorumlu</th>
                <th className="table-header text-left px-4 py-3">Durum</th>
                <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Kayıt</th>
                <th className="table-header text-right px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-black-border">
              {clients && clients.length > 0 ? (
                clients.map((client: any) => (
                  <tr key={client.id} className="hover:bg-brand-black-border/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-red/10 border border-brand-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-brand-red" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-brand-white">{client.company_name}</p>
                          <p className="text-xs text-brand-white-dim">{client.contact_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-brand-white-dim">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-brand-white-dim">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {client.city && (
                        <div className="flex items-center gap-1.5 text-xs text-brand-white-dim">
                          <MapPin className="w-3 h-3" />
                          {client.city}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {client.assigned_employee ? (
                        <div className="flex items-center gap-1.5 text-xs text-brand-white-dim">
                          <UserCheck className="w-3 h-3" />
                          {client.assigned_employee.full_name}
                        </div>
                      ) : (
                        <span className="text-xs text-brand-white-dim">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={client.is_active ? 'badge-green' : 'badge-gray'}>
                        {client.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-brand-white-dim">
                        {format(new Date(client.created_at), 'd MMM yyyy', { locale: tr })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/crm/clients/${client.id}`}
                        className="text-xs text-brand-red hover:text-brand-red-light transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Detay →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Users className="w-8 h-8 text-brand-black-border mx-auto mb-3" />
                    <p className="text-brand-white-dim">Henüz müşteri kaydı yok</p>
                    {isAdmin && (
                      <Link href="/crm/clients/new" className="text-brand-red text-sm hover:underline mt-2 inline-block">
                        İlk müşteriyi ekle →
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
