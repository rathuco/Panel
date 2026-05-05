import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Printer } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, client:clients(*), items:invoice_items(*)')
    .eq('id', params.id)
    .single()

  if (!invoice) notFound()

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/finance/invoices" className="btn-ghost"><ArrowLeft className="w-4 h-4" />Faturalar</Link>
          <h1 className="page-title">{invoice.invoice_number}</h1>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={invoice.status} type="invoice" />
        </div>
      </div>

      <div className="card space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">R</span>
              </div>
              <span className="font-black text-brand-white tracking-widest text-sm">RATHUDAN</span>
            </div>
            <p className="text-xs text-brand-white-dim">Dijital Ajans</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-white-dim">Fatura No</p>
            <p className="text-sm font-mono font-bold text-brand-white">{invoice.invoice_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 border-t border-brand-black-border pt-6">
          <div>
            <p className="text-xs text-brand-white-dim mb-2 uppercase tracking-wider">Fatura Alıcı</p>
            <p className="text-sm font-semibold text-brand-white">{invoice.client?.company_name}</p>
            <p className="text-sm text-brand-white-muted">{invoice.client?.contact_name}</p>
            <p className="text-xs text-brand-white-dim">{invoice.client?.email}</p>
            {invoice.client?.tax_number && <p className="text-xs text-brand-white-dim">VN: {invoice.client.tax_number}</p>}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div>
                <span className="text-xs text-brand-white-dim">Fatura Tarihi: </span>
                <span className="text-xs text-brand-white">{format(new Date(invoice.issue_date), 'd MMMM yyyy', { locale: tr })}</span>
              </div>
              <div>
                <span className="text-xs text-brand-white-dim">Vade Tarihi: </span>
                <span className="text-xs text-brand-white">{format(new Date(invoice.due_date), 'd MMMM yyyy', { locale: tr })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-brand-black-border pt-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-black-border">
                <th className="table-header text-left py-2">Açıklama</th>
                <th className="table-header text-right py-2">Miktar</th>
                <th className="table-header text-right py-2">Birim Fiyat</th>
                <th className="table-header text-right py-2">Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-black-border">
              {invoice.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-3 text-sm text-brand-white-muted">{item.description}</td>
                  <td className="py-3 text-sm text-brand-white-muted text-right">{item.quantity}</td>
                  <td className="py-3 text-sm text-brand-white-muted text-right">₺{item.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 text-sm text-brand-white text-right font-medium">₺{item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-brand-black-border pt-4 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-brand-white-dim">Ara Toplam</span>
            <span className="text-brand-white">₺{invoice.subtotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-white-dim">KDV %{invoice.tax_rate}</span>
            <span className="text-brand-white">₺{invoice.tax_amount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-brand-black-border pt-2">
            <span className="text-brand-white">Genel Toplam</span>
            <span className="text-brand-red">₺{invoice.total?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="border-t border-brand-black-border pt-4">
            <p className="text-xs text-brand-white-dim mb-1">Notlar</p>
            <p className="text-sm text-brand-white-muted">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
