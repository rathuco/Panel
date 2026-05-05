import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Plus, Clock } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default async function TicketsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, client:clients(company_name), assignee:profiles(full_name), creator:profiles!tickets_created_by_fkey(full_name)')
    .order('created_at', { ascending: false })

  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-brand-red" />
            Destek Biletleri
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">{tickets?.length || 0} bilet</p>
        </div>
        <Link href="/crm/tickets/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Yeni Bilet
        </Link>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => {
          const count = tickets?.filter((t) => t.status === status).length || 0
          const labels = { open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapalı' }
          return (
            <div key={status} className="card py-3 px-4 flex items-center justify-between">
              <span className="text-sm text-brand-white-muted">{labels[status]}</span>
              <span className="text-xl font-black text-brand-white">{count}</span>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-black-border">
                <th className="table-header text-left px-4 py-3">Başlık</th>
                <th className="table-header text-left px-4 py-3 hidden md:table-cell">Müşteri</th>
                <th className="table-header text-left px-4 py-3">Durum</th>
                <th className="table-header text-left px-4 py-3">Öncelik</th>
                <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Atanan</th>
                <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Tarih</th>
                <th className="table-header text-right px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-black-border">
              {tickets && tickets.length > 0 ? (
                tickets.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-brand-black-border/30 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-brand-white">{ticket.title}</p>
                      {ticket.category && <p className="text-xs text-brand-white-dim">{ticket.category}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-brand-white-muted">{ticket.client?.company_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} type="ticket" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.priority} type="priority" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-brand-white-muted">{ticket.assignee?.full_name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-brand-white-dim">
                        <Clock className="w-3 h-3" />
                        {format(new Date(ticket.created_at), 'd MMM yyyy', { locale: tr })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/crm/tickets/${ticket.id}`} className="text-xs text-brand-red hover:text-brand-red-light transition-colors opacity-0 group-hover:opacity-100">
                        Detay →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <MessageSquare className="w-8 h-8 text-brand-black-border mx-auto mb-3" />
                    <p className="text-brand-white-dim">Henüz bilet yok</p>
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
