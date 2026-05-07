'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'

interface LineItem { description: string; quantity: number; unit_price: number; total: number }

export default function NewInvoicePage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({
    client_id: '',
    status: 'draft',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_rate: 20,
    notes: '',
  })
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('clients').select('id, company_name').eq('is_active', true).order('company_name').then(({ data }) => setClients(data || []))
    // Default due date: 30 days from now
    const due = new Date()
    due.setDate(due.getDate() + 30)
    setForm(f => ({ ...f, due_date: due.toISOString().split('T')[0] }))
  }, [])

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      updated[index].total = updated[index].quantity * updated[index].unit_price
      return updated
    })
  }

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index))

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (form.tax_rate / 100)
  const total = subtotal + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Generate invoice number
    const year = new Date().getFullYear()
const { data: lastInvoice } = await supabase
  .from('invoices')
  .select('invoice_number')
  .like('invoice_number', `RTH-${year}-%`)
  .order('invoice_number', { ascending: false })
  .limit(1)
  .single()

let nextNum = 1
if (lastInvoice?.invoice_number) {
  const lastNum = parseInt(lastInvoice.invoice_number.split('-')[2]) || 0
  nextNum = lastNum + 1
}
const invoice_number = `RTH-${year}-${String(nextNum).padStart(4, '0')}`

    const { data: invoice, error: invErr } = await supabase.from('invoices').insert([{
      ...form,
      invoice_number,
      created_by: user.id,
      subtotal,
      tax_amount: taxAmount,
      total,
    }]).select().single()

    if (invErr) {
      setError(invErr.message)
      setLoading(false)
      return
    }

    if (invoice) {
      await supabase.from('invoice_items').insert(
        items.map(item => ({ ...item, invoice_id: invoice.id }))
      )
    }
// Eğer durum "paid" ise gelir kaydı oluştur
if (form.status === 'paid' && invoice) {
  await supabase.from('transactions').insert([{
    client_id: form.client_id,
    invoice_id: invoice.id,
    type: 'income',
    amount: total,
    currency: 'TRY',
    category: 'Fatura Ödemesi',
    description: `Fatura Ödemesi — ${invoice_number}`,
    date: new Date().toISOString().split('T')[0],
    created_by: user!.id,
  }])
}
    router.push('/finance/invoices')
  }

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/finance/invoices" className="btn-ghost"><ArrowLeft className="w-4 h-4" />Geri</Link>
        <h1 className="page-title">Yeni Fatura</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}

        {/* Header info */}
        <div className="card space-y-4">
          <h2 className="section-title">Fatura Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Müşteri *</label>
              <select className="select" value={form.client_id} onChange={(e) => set('client_id', e.target.value)} required>
                <option value="">Müşteri seçin...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Durum</label>
              <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="draft">Taslak</option>
                <option value="sent">Gönderildi</option>
                <option value="paid">Ödendi</option>
              </select>
            </div>
            <div>
              <label className="label">Fatura Tarihi</label>
              <input type="date" className="input" value={form.issue_date} onChange={(e) => set('issue_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Vade Tarihi</label>
              <input type="date" className="input" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} required />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Kalemler</h2>
            <button type="button" onClick={addItem} className="btn-ghost text-xs">
              <Plus className="w-3 h-3" /> Kalem Ekle
            </button>
          </div>

          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 text-xs text-brand-white-dim px-2">
              <div className="col-span-5">Açıklama</div>
              <div className="col-span-2 text-right">Miktar</div>
              <div className="col-span-2 text-right">Birim Fiyat</div>
              <div className="col-span-2 text-right">Toplam</div>
              <div className="col-span-1" />
            </div>

            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input className="input text-sm" placeholder="Hizmet açıklaması..." value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} required />
                </div>
                <div className="col-span-2">
                  <input type="number" className="input text-sm text-right" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="col-span-2">
                  <input type="number" className="input text-sm text-right" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="col-span-2 text-right text-sm font-medium text-brand-white pr-2">
                  ₺{item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-brand-white-dim hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-brand-black-border pt-4 space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-brand-white-dim">Ara Toplam</span>
              <span className="text-brand-white">₺{subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-brand-white-dim">KDV</span>
                <select className="bg-brand-black border border-brand-black-border rounded text-xs px-2 py-0.5 text-brand-white" value={form.tax_rate} onChange={(e) => set('tax_rate', parseFloat(e.target.value))}>
                  <option value={0}>%0</option>
                  <option value={10}>%10</option>
                  <option value={20}>%20</option>
                </select>
              </div>
              <span className="text-brand-white">₺{taxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-brand-black-border pt-2">
              <span className="text-brand-white">Genel Toplam</span>
              <span className="text-brand-red">₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card space-y-3">
          <label className="label">Notlar</label>
          <textarea className="input min-h-[80px] resize-none" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Fatura notu, ödeme bilgileri..." />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Fatura Oluştur
          </button>
          <Link href="/finance/invoices" className="btn-secondary">İptal</Link>
        </div>
      </form>
    </div>
  )
}
