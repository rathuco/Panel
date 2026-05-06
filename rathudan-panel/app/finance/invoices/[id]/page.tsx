'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Trash2, Edit2, Save, X, AlertTriangle, Plus } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [invoice, setInvoice] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    status: '', notes: '', due_date: '', tax_rate: 20,
  })
  const [editItems, setEditItems] = useState<any[]>([])

  useEffect(() => { fetchAll() }, [params.id])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: inv }, { data: invItems }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('invoices').select('*, client:clients(*)').eq('id', params.id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', params.id),
    ])

    setProfile(prof)
    setInvoice(inv)
    setItems(invItems || [])
    if (inv) {
      setEditForm({
        status: inv.status,
        notes: inv.notes || '',
        due_date: inv.due_date,
        tax_rate: inv.tax_rate,
      })
    }
    setEditItems(invItems || [])
    setLoading(false)
  }

  const isSuperAdmin = profile?.role === 'super_admin'

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('invoice_items').delete().eq('invoice_id', params.id)
    await supabase.from('invoices').delete().eq('id', params.id)
    setDeleting(false)
    router.push('/finance/invoices')
  }

  const updateEditItem = (index: number, field: string, value: any) => {
    setEditItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      updated[index].total = updated[index].quantity * updated[index].unit_price
      return updated
    })
  }

  const addEditItem = () => {
    setEditItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0, isNew: true }])
  }

  const removeEditItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index))
  }

  const subtotal = editItems.reduce((s, i) => s + (i.total || 0), 0)
  const taxAmount = subtotal * (editForm.tax_rate / 100)
  const total = subtotal + taxAmount

  const handleSave = async () => {
    setSaving(true)

    // Faturayı güncelle
    await supabase.from('invoices').update({
      status: editForm.status,
      notes: editForm.notes || null,
      due_date: editForm.due_date,
      tax_rate: editForm.tax_rate,
      subtotal,
      tax_amount: taxAmount,
      total,
    }).eq('id', params.id)

    // Kalemleri güncelle — önce sil sonra yeniden ekle
    await supabase.from('invoice_items').delete().eq('invoice_id', params.id)
    await supabase.from('invoice_items').insert(
      editItems.map(item => ({
        invoice_id: params.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }))
    )

    setSaving(false)
    setEditMode(false)
    fetchAll()
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
    </div>
  )

  if (!invoice) return (
    <div className="p-6 text-center">
      <p className="text-brand-white-dim">Fatura bulunamadı</p>
      <Link href="/finance/invoices" className="text-brand-red text-sm hover:underline mt-2 inline-block">← Faturalara Dön</Link>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/finance/invoices" className="btn-ghost">
            <ArrowLeft className="w-4 h-4" /> Faturalar
          </Link>
          <div>
            <h1 className="page-title">{invoice.invoice_number}</h1>
            <p className="text-brand-white-dim text-sm">{invoice.client?.company_name}</p>
          </div>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
                <button onClick={() => { setEditMode(false); fetchAll() }} className="btn-secondary">
                  <X className="w-4 h-4" /> İptal
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="btn-secondary">
                  <Edit2 className="w-4 h-4" /> Düzenle
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all">
                  <Trash2 className="w-4 h-4" /> Sil
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card space-y-6">
        {/* Fatura başlık */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">R</span>
            </div>
            <span className="font-black text-brand-white tracking-widest text-sm">RATHUDAN</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-white-dim">Fatura No</p>
            <p className="text-sm font-mono font-bold text-brand-white">{invoice.invoice_number}</p>
          </div>
        </div>

        {/* Bilgiler */}
        <div className="grid grid-cols-2 gap-6 border-t border-brand-black-border pt-6">
          <div>
            <p className="text-xs text-brand-white-dim mb-2 uppercase tracking-wider">Fatura Alıcı</p>
            <p className="text-sm font-semibold text-brand-white">{invoice.client?.company_name}</p>
            <p className="text-sm text-brand-white-muted">{invoice.client?.contact_name}</p>
            <p className="text-xs text-brand-white-dim">{invoice.client?.email}</p>
            {invoice.client?.tax_number && <p className="text-xs text-brand-white-dim">VN: {invoice.client.tax_number}</p>}
          </div>
          <div className="space-y-2 text-right">
            <div>
              <span className="text-xs text-brand-white-dim">Fatura Tarihi: </span>
              <span className="text-xs text-brand-white">{format(new Date(invoice.issue_date), 'd MMMM yyyy', { locale: tr })}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-brand-white-dim">Vade: </span>
              {editMode ? (
                <input type="date" className="input text-xs py-1 px-2 w-36" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
              ) : (
                <span className="text-xs text-brand-white">{format(new Date(invoice.due_date), 'd MMMM yyyy', { locale: tr })}</span>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-brand-white-dim">Durum: </span>
              {editMode ? (
                <select className="select text-xs py-1 px-2 w-32" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="draft">Taslak</option>
                  <option value="sent">Gönderildi</option>
                  <option value="paid">Ödendi</option>
                  <option value="overdue">Gecikmiş</option>
                  <option value="cancelled">İptal</option>
                </select>
              ) : (
                <StatusBadge status={invoice.status} type="invoice" />
              )}
            </div>
          </div>
        </div>

        {/* Kalemler */}
        <div className="border-t border-brand-black-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-brand-white-dim uppercase tracking-wider">Kalemler</p>
            {editMode && (
              <button onClick={addEditItem} className="btn-ghost text-xs py-1">
                <Plus className="w-3 h-3" /> Kalem Ekle
              </button>
            )}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-black-border">
                <th className="table-header text-left py-2">Açıklama</th>
                <th className="table-header text-right py-2">Miktar</th>
                <th className="table-header text-right py-2">Birim Fiyat</th>
                <th className="table-header text-right py-2">Toplam</th>
                {editMode && <th className="py-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-black-border">
              {(editMode ? editItems : items).map((item: any, index: number) => (
                <tr key={item.id || index}>
                  <td className="py-3">
                    {editMode ? (
                      <input className="input text-sm py-1" value={item.description} onChange={e => updateEditItem(index, 'description', e.target.value)} placeholder="Hizmet açıklaması..." />
                    ) : (
                      <span className="text-sm text-brand-white-muted">{item.description}</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {editMode ? (
                      <input type="number" className="input text-sm py-1 text-right w-20 ml-auto" value={item.quantity} onChange={e => updateEditItem(index, 'quantity', parseFloat(e.target.value) || 0)} min="0.01" step="0.01" />
                    ) : (
                      <span className="text-sm text-brand-white-muted">{item.quantity}</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {editMode ? (
                      <input type="number" className="input text-sm py-1 text-right w-28 ml-auto" value={item.unit_price} onChange={e => updateEditItem(index, 'unit_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" />
                    ) : (
                      <span className="text-sm text-brand-white-muted">₺{item.unit_price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-medium text-brand-white">
                      ₺{(editMode ? item.total : item.total)?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  {editMode && (
                    <td className="py-3 pl-2">
                      {editItems.length > 1 && (
                        <button onClick={() => removeEditItem(index)} className="text-brand-white-dim hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Toplamlar */}
        <div className="border-t border-brand-black-border pt-4 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-brand-white-dim">Ara Toplam</span>
            <span className="text-brand-white">₺{(editMode ? subtotal : invoice.subtotal)?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <div className="flex items-center gap-2">
              <span className="text-brand-white-dim">KDV</span>
              {editMode ? (
                <select className="bg-brand-black border border-brand-black-border rounded text-xs px-1.5 py-0.5 text-brand-white" value={editForm.tax_rate} onChange={e => setEditForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) }))}>
                  <option value={0}>%0</option>
                  <option value={10}>%10</option>
                  <option value={20}>%20</option>
                </select>
              ) : (
                <span className="text-brand-white-dim">%{invoice.tax_rate}</span>
              )}
            </div>
            <span className="text-brand-white">₺{(editMode ? taxAmount : invoice.tax_amount)?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-brand-black-border pt-2">
            <span className="text-brand-white">Genel Toplam</span>
            <span className="text-brand-red">₺{(editMode ? total : invoice.total)?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Notlar */}
        <div className="border-t border-brand-black-border pt-4">
          <p className="text-xs text-brand-white-dim mb-2">Notlar</p>
          {editMode ? (
            <textarea className="input resize-none" rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Fatura notu..." />
          ) : (
            <p className="text-sm text-brand-white-muted">{invoice.notes || '—'}</p>
          )}
        </div>
      </div>

      {/* Silme Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-white">Faturayı Sil</h2>
                <p className="text-xs text-brand-white-dim">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5">
              <p className="text-sm text-brand-white-muted">
                <span className="font-semibold text-brand-white">{invoice.invoice_number}</span> nolu fatura ve tüm kalemleri kalıcı olarak silinecek.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm"
              >
                {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Evet, Sil
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
