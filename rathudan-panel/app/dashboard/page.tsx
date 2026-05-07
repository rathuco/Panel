'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, FileText, MessageSquare, TrendingUp,
  FolderKanban, CheckSquare, HandshakeIcon, Package,
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function DashboardPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    totalClients: 0, activeClients: 0, openTickets: 0,
    activeProjects: 0, pendingTasks: 0, monthRevenue: 0,
  })
  const [recentTickets, setRecentTickets] = useState<any[]>([])
  const [recentMeetings, setRecentMeetings] = useState<any[]>([])
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const isAdmin = ['super_admin', 'admin'].includes(prof?.role || '')
    const isEmployee = prof?.role === 'employee'
    const isClient = prof?.role === 'client'

    if (isAdmin) {
      const [
        { count: totalClients },
        { count: activeClients },
        { count: openTickets },
        { count: activeProjects },
        { count: pendingTasks },
        { data: tickets },
        { data: meetings },
        { data: invoices },
        { data: revenue },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done'),
        supabase.from('tickets').select('*, client:clients(company_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('meetings').select('*, client:clients(company_name), employee:profiles!meetings_employee_id_fkey(full_name)').order('date', { ascending: false }).limit(5),
        supabase.from('invoices').select('*, client:clients(company_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('transactions').select('amount').eq('type', 'income').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
      ])

      const monthRevenue = (revenue || []).reduce((s: number, t: any) => s + (t.amount || 0), 0)
      setStats({ totalClients: totalClients || 0, activeClients: activeClients || 0, openTickets: openTickets || 0, activeProjects: activeProjects || 0, pendingTasks: pendingTasks || 0, monthRevenue })
      setRecentTickets(tickets || [])
      setRecentMeetings(meetings || [])
      setRecentInvoices(invoices || [])

    } else if (isEmployee) {
      const [
        { count: openTickets },
        { count: activeProjects },
        { count: pendingTasks },
        { data: tickets },
        { data: meetings },
      ] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done'),
        supabase.from('tickets').select('*, client:clients(company_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('meetings').select('*, client:clients(company_name), employee:profiles!meetings_employee_id_fkey(full_name)').eq('employee_id', user.id).order('date', { ascending: false }).limit(5),
      ])

      setStats(s => ({ ...s, openTickets: openTickets || 0, activeProjects: activeProjects || 0, pendingTasks: pendingTasks || 0 }))
      setRecentTickets(tickets || [])
      setRecentMeetings(meetings || [])

    } else if (isClient) {
      const { data: clientRecord } = await supabase.from('clients').select('id').eq('email', prof.email).single()

      const [
        { count: openTickets },
        { data: tickets },
        { data: invoices },
      ] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open').eq('created_by', user.id),
        supabase.from('tickets').select('*, client:clients(company_name)').eq('created_by', user.id).order('created_at', { ascending: false }).limit(5),
        clientRecord
          ? supabase.from('invoices').select('*, client:clients(company_name)').eq('client_id', clientRecord.id).order('created_at', { ascending: false }).limit(5)
          : { data: [] },
      ])

      setStats(s => ({ ...s, openTickets: openTickets || 0 }))
      setRecentTickets(tickets || [])
      setRecentInvoices(invoices || [])
    }

    setLoading(false)
  }

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')
  const isEmployee = profile?.role === 'employee'
  const isClient = profile?.role === 'client'

  const adminLinks = [
    { href: '/crm/clients/new', label: 'Yeni Müşteri', icon: Users },
    { href: '/crm/tickets/new', label: 'Yeni Bilet', icon: MessageSquare },
    { href: '/finance/invoices/new', label: 'Yeni Fatura', icon: FileText },
    { href: '/meetings', label: 'Görüşme Ekle', icon: HandshakeIcon },
    { href: '/projects', label: 'Görev Takibi', icon: CheckSquare },
    { href: '/finance/transactions', label: 'Gelir/Gider', icon: TrendingUp },
  ]

  const employeeLinks = [
    { href: '/meetings', label: 'Görüşme Ekle', icon: HandshakeIcon },
    { href: '/projects', label: 'Görev Takibi', icon: CheckSquare },
    { href: '/crm/clients', label: 'Müşteriler', icon: Users },
  ]

  const clientLinks = [
    { href: '/crm/tickets/new', label: 'Destek Talebi Oluştur', icon: MessageSquare },
    { href: '/finance/invoices', label: 'Faturalarım', icon: FileText },
    { href: '/packages', label: 'Paketlerim', icon: Package },
  ]

  const quickLinks = isAdmin ? adminLinks : isEmployee ? employeeLinks : clientLinks

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
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

      {/* İstatistikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin && (
          <>
            <StatCard title="Toplam Müşteri" value={stats.totalClients} subtitle={`${stats.activeClients} aktif`} icon={Users} color="blue" />
            <StatCard title="Açık Biletler" value={stats.openTickets} subtitle="Yanıt bekliyor" icon={MessageSquare} color="amber" />
            <StatCard title="Aylık Gelir" value={`₺${stats.monthRevenue.toLocaleString('tr-TR')}`} subtitle="Bu ay" icon={TrendingUp} color="green" />
            <StatCard title="Aktif Projeler" value={stats.activeProjects} subtitle={`${stats.pendingTasks} bekleyen görev`} icon={FolderKanban} color="purple" />
          </>
        )}
        {isEmployee && (
          <>
            <StatCard title="Açık Biletler" value={stats.openTickets} subtitle="Yanıt bekliyor" icon={MessageSquare} color="amber" />
            <StatCard title="Aktif Projeler" value={stats.activeProjects} subtitle="Devam eden" icon={FolderKanban} color="blue" />
            <StatCard title="Bekleyen Görevler" value={stats.pendingTasks} subtitle="Tamamlanmadı" icon={CheckSquare} color="purple" />
          </>
        )}
        {isClient && (
          <>
            <StatCard title="Açık Taleplerim" value={stats.openTickets} subtitle="Yanıt bekleniyor" icon={MessageSquare} color="amber" />
            <StatCard title="Faturalarım" value={recentInvoices.length} subtitle="Toplam kayıt" icon={FileText} color="blue" />
          </>
        )}
      </div>

      {/* İçerik */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son Biletler */}
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
            {recentTickets.length > 0 ? recentTickets.map((ticket: any) => (
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
            )) : (
              <p className="text-brand-white-dim text-sm text-center py-6">Henüz bilet yok</p>
            )}
          </div>
        </div>

        {/* Son Görüşmeler */}
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
              {recentMeetings.length > 0 ? recentMeetings.map((meeting: any) => (
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
              )) : (
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
              {recentInvoices.length > 0 ? recentInvoices.map((inv: any) => (
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
              )) : (
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
