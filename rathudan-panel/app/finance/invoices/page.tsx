'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function InvoicesPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const isClient = prof?.role === 'client'

    let query = supabase
      .from('invoices')
      .select('*, client:clients(company_name, email)')
      .order('created_at', { ascending: false })

    if (isClient) {
      // Müşterinin client kaydını bul
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('id')
        .eq('email', prof.email)
        .single()

      if (clientRecord) {
        query = query.eq('client_id', clientRecord.id) as any
      }
    }

    const { data } = await query
    setInvoices(data || [])
    setLoading(false)
  }

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')
  const isClient = profile?.role === 'client'

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0)

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
            <FileText className="w-6 h-6 text-brand-red" />
            {isClient ? 'Faturalarım' : 'Faturalar'}
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">{invoices.length} fatura</p>
        </div>
        {isAdmin && (
          <Link href="/finance/invoices/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Yeni Fatura
          </Link>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card py-4">
            <p className="text-xs text-brand-white-dim mb-1">Tahsil Edildi</p>
            <p className="text-xl font-black text-emerald-400">₺{totalPaid.toLocaleString('tr-TR')}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-brand-white-dim mb-1">Bekleyen</p>
            <p className="text-xl font-black text-blue-400">₺{totalPending.toLocaleString('tr-TR')}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-brand-white-dim mb-1">Gecikmiş</p>
            <p className="text-xl font-black text-red-400">₺{totalOverdue.toLocaleString('tr-TR')}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-black-border">
                <th className="table-header text-left px-4 py-3">Fatura No</th>
                {!isClient && <th className="table-header text-left px-4 py-3 hidden md:table-cell">Müşteri</th>}
                <th className="table-header text-left px-4 py-3">Durum</th>
                <th className="table-header text-right px-4 py-3">Tutar</th>
                <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Tarih</th>
                <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Vade</th>
                <th className="table-header text-right px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-black-border">
              {invoices.length > 0 ? invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-brand-black-border/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-semibold text-brand-white">{inv.invoice_number}</span>
                  </td>
                  {!isClient && (
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-brand-white-muted">{inv.client?.company_name}</span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} type="invoice" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-brand-white">
                      ₺{inv.total?.toLocaleString('tr-TR')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-brand-white-dim">
                      {format(new Date(inv.issue_date), 'd MMM yyyy', { locale: tr })}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-xs ${inv.status === 'overdue' ? 'text-red-400' : 'text-brand-white-dim'}`}>
                      {format(new Date(inv.due_date), 'd MMM yyyy', { locale: tr })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/finance/invoices/${inv.id}`} className="text-xs text-brand-red hover:text-brand-red-light transition-colors opacity-0 group-hover:opacity-100">
                      Detay →
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FileText className="w-8 h-8 text-brand-black-border mx-auto mb-3" />
                    <p className="text-brand-white-dim">
                      {isClient ? 'Henüz fatura yok' : 'Henüz fatura oluşturulmadı'}
                    </p>
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
