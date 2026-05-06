'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { MessageSquare, Plus, Clock } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function TicketsPage() {
  const supabase = createClient()
  const [tickets, setTickets] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setProfile(prof)

    const isClient = prof?.role === 'client'

    let query = supabase
      .from('tickets')
      .select('*, client:clients(company_name), assignee:profiles!tickets_assigned_to_fkey(full_name)')
      .order('created_at', { ascending: false })

    if (isClient) {
      query = query.eq('created_by', user.id) as any
    }

    const { data: t } = await query
    setTickets(t || [])
    setLoading(false)
  }

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')
  const isClient = profile?.role === 'client'

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-brand-red" />
            {isClient ? 'Destek Taleplerim' : 'Destek Biletleri'}
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">
            {tickets.length} {isClient ? 'talep' : 'bilet'}
          </p>
        </div>
        <Link href="/crm/tickets/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          {isClient ? 'Yeni Talep' : 'Yeni Bilet'}
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['open', 'in_progress', 'resolved', 'closed'] as const).map(status => {
          const count = tickets.filter(t => t.status === status).length
          const labels = { open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapalı' }
          return (
            <div key={status} className="card py-3 px-4 flex items-center justify-between">
              <span className="text-sm text-brand-white-muted">{labels[status]}</span>
              <span className="text-xl font-black text-brand-white">{count}</span>
            </div>
          )
        })}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-black-border">
                <th className="table-header text-left px-4 py-3">Başlık</th>
                {!isClient && <th className="table-header text-left px-4 py-3 hidden md:table-cell">Müşteri</th>}
                <th className="table-header text-left px-4 py-3">Durum</th>
                <th className="table-header text-left px-4 py-3">Öncelik</th>
                {!isClient && <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Atanan</th>}
                <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Tarih</th>
                <th className="table-header text-right px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-black-border">
              {tickets.length > 0 ? (
                tickets.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-brand-black-border/30 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-brand-white">{ticket.title}</p>
                      {ticket.category && <p className="text-xs text-brand-white-dim">{ticket.category}</p>}
                    </td>
                    {!isClient && (
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-brand-white-muted">{ticket.client?.company_name}</span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} type="ticket" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.priority} type="priority" />
                    </td>
                    {!isClient && (
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-brand-white-muted">
                          {ticket.assignee?.full_name || '—'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-brand-white-dim">
                        <Clock className="w-3 h-3" />
                        {format(new Date(ticket.created_at), 'd MMM yyyy', { locale: tr })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/crm/tickets/${ticket.id}`}
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
                    <MessageSquare className="w-8 h-8 text-brand-black-border mx-auto mb-3" />
                    <p className="text-brand-white-dim">
                      {isClient ? 'Henüz destek talebiniz yok' : 'Henüz bilet yok'}
                    </p>
                    <Link href="/crm/tickets/new" className="text-brand-red text-sm hover:underline mt-2 inline-block">
                      {isClient ? 'İlk talebinizi oluşturun →' : 'İlk bileti oluşturun →'}
                    </Link>
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
