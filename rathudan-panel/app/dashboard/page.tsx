import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Users, FileText, MessageSquare, TrendingUp,
  FolderKanban, CheckSquare, HandshakeIcon, Package,
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')
  const isEmployee = profile?.role === 'employee'
  const isClient = profile?.role === 'client'

  // Fetch stats based on role
  const [
    { count: totalClients },
    { count: activeClients },
    { count: openTickets },
    { count: activeProjects },
    { count: pendingTasks },
    { data: recentTickets },
    { data: recentMeetings },
    { data: recentInvoices },
    { data: monthlyRevenue },
  ] = await Promise.all([
    isAdmin
      ? supabase.from('clients').select('*', { count: 'exact', head: true })
      : { count: 0 },
    isAdmin
      ? supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true)
      : { count: 0 },
    isClient
      ? supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open').eq('created_by', user.id)
      : supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    isAdmin || isEmployee
      ? supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active')
      : { count: 0 },
    isAdmin || isEmployee
      ? supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done')
      : { count: 0 },
    isClient
      ? supabase.from('tickets').select('*, client:clients(company_name)').eq('created_by', user.id).order('created_at', { ascending: false }).limit(5)
      : supabase.from('tickets').select('*, client:clients(company_name)').order('created_at', { ascending: false }).limit(5),
    isAdmin
      ? supabase.from('meetings').select('*, client:clients(company_name), employee:profiles(full_name)').order('date', { ascending: false }).limit(5)
      : isEmployee
        ? supabase.from('meetings').select('*, client:clients(company_name), employee:profiles(full_name)').eq('employee_id', user.id).order('date', { ascending: false }).limit(5)
        : { data: [] },
    isClient
      ? supabase.from('invoices').select('*, client:clients(company_name)').eq('client_id', user.id).order('created_at', { ascending: false }).limit(5)
      : supabase.from('invoices').select('*, client:clients(company_name)').order('created_at', { ascending: false }).limit(5),
    isAdmin
      ? supabase.from('transactions').select('amount').eq('type', 'income').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      : { data: [] },
  ])

  const monthRevenue = (monthlyRevenue as any[])?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0

  // Quick links by role
  const adminLinks = [
    { href: '/crm/clients/new', label: 'Yeni Müşteri', icon: Users },
    { href: '/crm/tickets/new', label: 'Yeni Bilet', icon: MessageSquare },
    { href: '/finance/invoices/new', label: 'Yeni Fatura', icon: FileText },
    { href: '/meetings/new', label: 'Görüşme Ekle', icon: HandshakeIcon },
    { href: '/projects', label: 'Görev Takibi', icon: CheckSquare },
    { href: '/finance/transactions', label: 'Gelir/Gider', icon: TrendingUp },
  ]

  const employeeLinks = [
    { href: '/crm/tickets/new', label: 'Yeni Bilet', icon: MessageSquare },
    { href: '/meetings/new', label: 'Görüşme Ekle', icon: HandshakeIcon },
    { href: '/projects', label: 'Görev Takibi', icon: CheckSquare },
    { href: '/crm/clients', label: 'Müşteriler', icon: Users },
  ]

  const clientLinks = [
    { href: '/crm/tickets/new', label: 'Destek Talebi Oluştur', icon: MessageSquare },
    { href: '/finance/invoices', label: 'Faturalarım', icon: FileText },
    { href: '/packages', label: 'Paketlerim', icon: Package },
  ]

  const quickLinks = isAdmin ? adminLinks : isEmployee ? employeeLinks : clientLinks

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            Hoş geldin, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">
            {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-brand-red/10 border border-brand-red/20 rounded-xl px-4 py-2">
          <div className="w-2 h-2 bg-brand-red rounded-full animate-pulse" />
          <span className="text-brand-red text-sm font-semibold">Sistem Aktif</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin && (
          <>
            <StatCard title="Toplam Müşteri" value={totalClients || 0} subtitle={`${activeClients || 0} aktif`} icon={Users} color="blue" />
            <StatCard title="Açık Biletler" value={openTickets || 0} subtitle="Yanıt bekliyor" icon={MessageSquare} color="amber" />
            <StatCard title="Aylık Gelir" value={`₺${monthRevenue.toLocaleString('tr-TR')}`} subtitle="Bu ay" icon={TrendingUp} color="green" />
            <StatCard title="Aktif Projeler" value={activeProjects || 0} subtitle={`${pendingTasks || 0} bekleyen görev`} icon={FolderKanban} color="purple" />
          </>
        )}
        {isEmployee && (
          <>
            <StatCard title="Açık Biletler" value={openTickets || 0} subtitle="Yanıt bekliyor" icon={MessageSquare} color="amber" />
            <StatCard title="Aktif Projeler" value={activeProjects || 0} subtitle="Devam eden" icon={FolderKanban} color="blue" />
            <StatCard title="Bekleyen Görevler" value={pendingTasks || 0} subtitle="Tamamlanmadı" icon={CheckSquare} color="purple" />
          </>
        )}
        {isClient && (
          <>
            <StatCard title="Açık Taleplerim" value={openTickets || 0} subtitle="Yanıt bekleniyor" icon={MessageSquare} color="amber" />
            <StatCard title="Faturalarım" value={(recentInvoices as any[])?.length || 0} subtitle="Toplam kayıt" icon={FileText} color="blue" />
          </>
        )}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-red" />
              {isClient ? 'Taleplerim' : 'Son Destek Biletleri'}
            </h2>
            <Link href="/crm/tickets" className="text-xs text-brand-red hover:text-brand-red-light transition-colors">
              Tümünü Gör →
            </Link>
          </div>
          <div className="space-y-2">
            {(recentTickets as any[]) && (recentTickets as any[]).length > 0 ? (
              (recentTickets as any[]).map((ticket: any) => (
                <Link
                  key={ticket.id}
                  href={`/crm/tickets/${ticket.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-brand-black-border transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-white truncate group-hover:text-brand-red transition-colors">
                      {ticket.title}
                    </p>
                    {!isClient && <p className="text-xs text-brand-white-dim">{ticket.client?.company_name}</p>}
                  </div>
                  <StatusBadge status={ticket.status} type="ticket" />
                </Link>
              ))
            ) : (
              <p className="text-brand-white-dim text-sm text-center py-6">Henüz bilet yok</p>
            )}
          </div>
        </div>

        {/* Son Görüşmeler — sadece admin ve employee */}
        {(isAdmin || isEmployee) && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <HandshakeIcon className="w-4 h-4 text-brand-red" />
                Son Görüşmeler
              </h2>
              <Link href="/meetings" className="text-xs text-brand-red hover:text-brand-red-light transition-colors">
                Tümünü Gör →
              </Link>
            </div>
            <div className="space-y-2">
              {(recentMeetings as any[]) && (recentMeetings as any[]).length > 0 ? (
                (recentMeetings as any[]).map((meeting: any) => (
                  <div key={meeting.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-brand-black-border transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-white truncate">{meeting.title}</p>
                      <p className="text-xs text-brand-white-dim">
                        {meeting.client?.company_name} · {meeting.employee?.full_name}
                      </p>
                      <p className="text-xs text-brand-white-dim">
                        {format(new Date(meeting.date), 'd MMM yyyy HH:mm', { locale: tr })}
                      </p>
                    </div>
                    <StatusBadge status={meeting.meeting_type} type="meeting" />
                  </div>
                ))
              ) : (
                <p className="text-brand-white-dim text-sm text-center py-6">Henüz görüşme yok</p>
              )}
            </div>
          </div>
        )}

        {/* Son Faturalar */}
        {(isAdmin || isClient) && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-red" />
                {isClient ? 'Son Faturalarım' : 'Son Faturalar'}
              </h2>
              <Link href="/finance/invoices" className="text-xs text-brand-red hover:text-brand-red-light transition-colors">
                Tümünü Gör →
              </Link>
            </div>
            <div className="space-y-2">
              {(recentInvoices as any[]) && (recentInvoices as any[]).length > 0 ? (
                (recentInvoices as any[]).map((inv: any) => (
                  <Link
                    key={inv.id}
                    href={`/finance/invoices/${inv.id}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-brand-black-border transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-white group-hover:text-brand-red transition-colors">
                        {inv.invoice_number}
                      </p>
                      {!isClient && <p className="text-xs text-brand-white-dim">{inv.client?.company_name}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-brand-white">₺{inv.total?.toLocaleString('tr-TR')}</span>
                      <StatusBadge status={inv.status} type="invoice" />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-brand-white-dim text-sm text-center py-6">Henüz fatura yok</p>
              )}
            </div>
          </div>
        )}

        {/* Hızlı Erişim */}
        <div className="card">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <CheckSquare className="w-4 h-4 text-brand-red" />
            Hızlı Erişim
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-lg bg-brand-black border border-brand-black-border hover:border-brand-red/40 hover:bg-brand-red/5 transition-all group"
                >
                  <Icon className="w-4 h-4 text-brand-white-dim group-hover:text-brand-red transition-colors" />
                  <span className="text-sm text-brand-white-muted group-hover:text-brand-white transition-colors">
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
