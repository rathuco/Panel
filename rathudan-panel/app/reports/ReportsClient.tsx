'use client'

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, parseISO, startOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'

const COLORS = ['#C2212E', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

function groupByMonth(items: any[], dateField: string, valueField?: string) {
  const map: Record<string, number> = {}
  items.forEach(item => {
    try {
      const month = format(parseISO(item[dateField]), 'MMM yy', { locale: tr })
      map[month] = (map[month] || 0) + (valueField ? (item[valueField] || 0) : 1)
    } catch {}
  })
  return Object.entries(map).map(([month, value]) => ({ month, value }))
}

export default function ReportsClient({ transactions, clients, tickets, meetings, projects }: {
  transactions: any[], clients: any[], tickets: any[], meetings: any[], projects: any[]
}) {
  // Monthly revenue vs expense
  const incomeByMonth: Record<string, { month: string; gelir: number; gider: number }> = {}
  transactions.forEach(t => {
    try {
      const month = format(parseISO(t.date), 'MMM yy', { locale: tr })
      if (!incomeByMonth[month]) incomeByMonth[month] = { month, gelir: 0, gider: 0 }
      if (t.type === 'income') incomeByMonth[month].gelir += t.amount
      else incomeByMonth[month].gider += t.amount
    } catch {}
  })
  const revenueData = Object.values(incomeByMonth)

  // Ticket status distribution
  const ticketByStatus: Record<string, number> = {}
  tickets.forEach(t => { ticketByStatus[t.status] = (ticketByStatus[t.status] || 0) + 1 })
  const ticketStatusData = Object.entries(ticketByStatus).map(([name, value]) => ({
    name: { open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapalı' }[name] || name,
    value
  }))

  // Meeting type distribution
  const meetingByType: Record<string, number> = {}
  meetings.forEach(m => { meetingByType[m.meeting_type] = (meetingByType[m.meeting_type] || 0) + 1 })
  const meetingTypeData = Object.entries(meetingByType).map(([name, value]) => ({
    name: { face_to_face: 'Yüz Yüze', online: 'Online', phone: 'Telefon' }[name] || name,
    value
  }))

  // Meeting outcomes
  const meetingOutcomes: Record<string, number> = {}
  meetings.filter(m => m.outcome).forEach(m => { meetingOutcomes[m.outcome] = (meetingOutcomes[m.outcome] || 0) + 1 })
  const outcomeData = Object.entries(meetingOutcomes).map(([name, value]) => ({
    name: { successful: 'Başarılı', follow_up_needed: 'Takip', no_decision: 'Karar Yok', cancelled: 'İptal' }[name] || name,
    value
  }))

  // New clients by month
  const clientsByMonth = groupByMonth(clients, 'created_at')

  // Ticket priority
  const ticketByPriority: Record<string, number> = {}
  tickets.forEach(t => { ticketByPriority[t.priority] = (ticketByPriority[t.priority] || 0) + 1 })
  const priorityData = Object.entries(ticketByPriority).map(([name, value]) => ({
    name: { low: 'Düşük', medium: 'Orta', high: 'Yüksek', urgent: 'Acil' }[name] || name, value
  }))

  const totalRevenue = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const tooltipStyle = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#fafafa',
    fontSize: '12px',
  }

  return (
    <div className="space-y-6">
      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card py-4 text-center">
          <p className="text-2xl font-black text-emerald-400">₺{totalRevenue.toLocaleString('tr-TR')}</p>
          <p className="text-xs text-brand-white-dim mt-1">Toplam Gelir (6 ay)</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-black text-red-400">₺{totalExpense.toLocaleString('tr-TR')}</p>
          <p className="text-xs text-brand-white-dim mt-1">Toplam Gider (6 ay)</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-black text-brand-white">{clients.filter(c => c.is_active).length}</p>
          <p className="text-xs text-brand-white-dim mt-1">Aktif Müşteri</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-black text-brand-white">{meetings.filter(m => m.outcome === 'successful').length}</p>
          <p className="text-xs text-brand-white-dim mt-1">Başarılı Görüşme</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="card">
        <h2 className="section-title mb-6">Gelir / Gider (Aylık)</h2>
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGider" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C2212E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C2212E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₺${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a0a0a0' }} />
              <Area type="monotone" dataKey="gelir" name="Gelir" stroke="#10b981" fill="url(#colorGelir)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="gider" name="Gider" stroke="#C2212E" fill="url(#colorGider)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-brand-white-dim text-sm">Veri bulunamadı</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ticket status pie */}
        <div className="card">
          <h2 className="section-title mb-6">Bilet Dağılımı</h2>
          {ticketStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ticketStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {ticketStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#a0a0a0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-brand-white-dim text-sm">Veri yok</div>
          )}
        </div>

        {/* Meeting types */}
        <div className="card">
          <h2 className="section-title mb-6">Görüşme Türleri</h2>
          {meetingTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={meetingTypeData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#a0a0a0', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Görüşme" fill="#C2212E" radius={[0, 4, 4, 0]}>
                  {meetingTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-brand-white-dim text-sm">Veri yok</div>
          )}
        </div>

        {/* Meeting outcomes */}
        <div className="card">
          <h2 className="section-title mb-6">Görüşme Sonuçları</h2>
          {outcomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={outcomeData} cx="50%" cy="50%" outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {outcomeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-brand-white-dim text-sm">Veri yok</div>
          )}
        </div>

        {/* New clients per month */}
        <div className="card">
          <h2 className="section-title mb-6">Yeni Müşteri (Aylık)</h2>
          {clientsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={clientsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="month" tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Yeni Müşteri" fill="#C2212E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-brand-white-dim text-sm">Veri yok</div>
          )}
        </div>
      </div>
    </div>
  )
}
