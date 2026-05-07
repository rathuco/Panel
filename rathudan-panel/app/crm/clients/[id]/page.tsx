import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Phone, Mail, MapPin, Edit, Package, MessageSquare, FileText, HandshakeIcon } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')

  const { data: client } = await supabase
    .from('clients')
    .select('*, assigned_employee:profiles(full_name)')
    .eq('id', params.id)
    .single()

  if (!client) notFound()

  const [
    { data: tickets },
    { data: invoices },
    { data: clientPackages },
    { data: meetings },
  ] = await Promise.all([
    supabase.from('tickets').select('*').eq('client_id', params.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('*').eq('client_id', params.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('client_packages').select('*, package:packages(name)').eq('client_id', params.id),
    supabase.from('meetings').select('*, employee:profiles(full_name)').eq('client_id', params.id).order('date', { ascending: false }).limit(5),
  ])

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm/clients" className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            Müşteriler
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-red" />
            </div>
            <div>
              <h1 className="page-title">{client.company_name}</h1>
              <p className="text-brand-white-dim text-sm">{client.contact_name}</p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <Link href={`/crm/clients/${params.id}/edit`} className="btn-secondary">
            <Edit className="w-4 h-4" />
            Düzenle
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="card space-y-4">
          <h2 className="section-title">İletişim Bilgileri</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-brand-red flex-shrink-0" />
              <span className="text-brand-white-muted">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-brand-red flex-shrink-0" />
                <span className="text-brand-white-muted">{client.phone}</span>
              </div>
            )}
            {client.city && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-brand-red flex-shrink-0" />
                <span className="text-brand-white-muted">{client.address ? `${client.address}, ` : ''}{client.city}</span>
              </div>
            )}
          </div>
          <div className="border-t border-brand-black-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-brand-white-dim">Durum</span>
              <span className={client.is_active ? 'badge-green' : 'badge-gray'}>
                {client.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            {client.tax_number && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-white-dim">Vergi No</span>
                <span className="text-brand-white-muted">{client.tax_number}</span>
              </div>
            )}
            {client.assigned_employee && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-white-dim">Sorumlu</span>
                <span className="text-brand-white-muted">{client.assigned_employee.full_name}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-brand-white-dim">Kayıt</span>
              <span className="text-brand-white-muted">{format(new Date(client.created_at), 'd MMM yyyy', { locale: tr })}</span>
            </div>
          </div>
          {client.notes && (
      {/* Panel Giriş Bilgileri — sadece staff */}
{profile?.role !== 'client' && client.temp_password && (
  <div className="border-t border-brand-black-border pt-4">
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs text-brand-white-dim">Panel Giriş Bilgileri</p>
      {!client.password_changed && (
        <span className="badge-yellow">⚠ Şifre değiştirilmedi</span>
      )}
    </div>
    <div className="bg-brand-black border border-brand-black-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-brand-white-dim">E-posta</span>
        <span className="text-xs text-brand-white font-mono">{client.email}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-brand-white-dim">Geçici Şifre</span>
        <span className="text-sm text-amber-400 font-mono font-bold tracking-wider">
          {client.temp_password}
        </span>
      </div>
    </div>
    {!client.password_changed && (
      <p className="text-xs text-brand-white-dim mt-1.5">
        Müşteri henüz şifresini değiştirmedi. İlk girişte değiştirmesi zorunludur.
      </p>
    )}
  </div>
)}
            <div className="border-t border-brand-black-border pt-4">
              <p className="text-xs text-brand-white-dim mb-1">Notlar</p>
              <p className="text-sm text-brand-white-muted">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Packages */}
          {clientPackages && clientPackages.length > 0 && (
            <div className="card">
              <h2 className="section-title flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-brand-red" />
                Aktif Paketler
              </h2>
              <div className="space-y-2">
                {clientPackages.map((cp: any) => (
                  <div key={cp.id} className="flex items-center justify-between py-2 px-3 bg-brand-black rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-brand-white">{cp.package?.name}</p>
                      <p className="text-xs text-brand-white-dim">{cp.start_date} – {cp.end_date || 'Devam ediyor'}</p>
                    </div>
                    <StatusBadge status={cp.status} type="package" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Tickets */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-red" />
                Destek Biletleri
              </h2>
              <Link href={`/crm/tickets/new?client=${params.id}`} className="text-xs text-brand-red hover:underline">
                + Yeni Bilet
              </Link>
            </div>
            {tickets && tickets.length > 0 ? (
              <div className="space-y-2">
                {tickets.map((t: any) => (
                  <Link key={t.id} href={`/crm/tickets/${t.id}`} className="flex items-center justify-between py-2 px-3 bg-brand-black rounded-lg hover:bg-brand-black-border transition-colors">
                    <span className="text-sm text-brand-white">{t.title}</span>
                    <StatusBadge status={t.status} type="ticket" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-brand-white-dim text-sm">Destek bileti yok</p>
            )}
          </div>

          {/* Meetings */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <HandshakeIcon className="w-4 h-4 text-brand-red" />
                Görüşme Geçmişi
              </h2>
              <Link href={`/meetings/new?client=${params.id}`} className="text-xs text-brand-red hover:underline">
                + Görüşme Ekle
              </Link>
            </div>
            {meetings && meetings.length > 0 ? (
              <div className="space-y-2">
                {meetings.map((m: any) => (
                  <div key={m.id} className="py-2 px-3 bg-brand-black rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-brand-white">{m.title}</span>
                      <StatusBadge status={m.meeting_type} type="meeting" />
                    </div>
                    <p className="text-xs text-brand-white-dim mt-1">
                      {format(new Date(m.date), 'd MMM yyyy HH:mm', { locale: tr })} · {m.employee?.full_name}
                    </p>
                    {m.outcome && <StatusBadge status={m.outcome} type="meeting" />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-brand-white-dim text-sm">Görüşme kaydı yok</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
