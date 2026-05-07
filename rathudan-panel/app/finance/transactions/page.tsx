'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, TrendingUp, TrendingDown, CreditCard, X, Save, Trash2, AlertTriangle, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import Link from 'next/link'

const CATEGORIES_INCOME = ['Proje Geliri', 'Danışmanlık', 'Web Sitesi', 'SMM', 'Grafik', 'Yazılım', 'Fotoğraf', 'Fatura Ödemesi', 'Diğer']
const CATEGORIES_EXPENSE = ['Yazılım/Araç', 'Personel', 'Kira', 'Reklam', 'Ulaşım', 'Ekipman', 'Vergi', 'Diğer']

export default function TransactionsPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    type: 'income', amount: '', currency: 'TRY',
    category: '', description: '', date: new Date().toISOString().split('T')[0], client_id: '',
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setProfile(prof)

    const [{ data: t }, { data: cl }] = await Promise.all([
      supabase.from('transactions')
        .select('*, client:clients(company_name), invoice:invoices(id, invoice_number)')
        .order('date', { ascending: false }),
      supabase.from('clients').select('id, company_name').order('company_name'),
    ])

    setTransactions(t || [])
    setClients(cl || [])
    setLoading(false)
  }

  const isSuperAdmin = profile?.role === 'super_admin'

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('transactions').insert([{
      ...form,
      amount: parseFloat(form.amount),
      created_by: user!.id,
      client_id: form.client_id || null,
    }])
    setSubmitting(false)
    setShowModal(false)
    setForm({ type: 'income', amount: '', currency: 'TRY', category: '', description: '', date: new Date().toISOString().split('T')[0], client_id: '' })
    fetchAll()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('transactions').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setShowDeleteModal(false)
    setDeleteTarget(null)
    fetchAll()
  }

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

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
            <CreditCard className="w-6 h-6 text-brand-red" />
            Gelir / Gider
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">{transactions.length} kayıt</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Kayıt Ekle
        </button>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card py-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-brand-white-dim">Toplam Gelir</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">₺{totalIncome.toLocaleString('tr-TR')}</p>
        </div>
        <div className="card py-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-brand-white-dim">Toplam Gider</span>
          </div>
          <p className="text-2xl font-black text-red-400">₺{totalExpense.toLocaleString('tr-TR')}</p>
        </div>
        <div className="card py-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-brand-red" />
            <span className="text-xs text-brand-white-dim">Net Kâr</span>
          </div>
          <p className={`text-2xl font-black ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ₺{(totalIncome - totalExpense).toLocaleString('tr-TR')}
          </p>
        </div>
      </div>

      {/* Tablo */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-black-border">
                <th className="table-header text-left px-4 py-3">Tarih</th>
                <th className="table-header text-left px-4 py-3">Tür</th>
                <th className="table-header text-left px-4 py-3">Kategori</th>
                <th className="table-header text-left px-4 py-3 hidden md:table-cell">Açıklama</th>
                <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Müşteri</th>
                <th className="table-header text-right px-4 py-3">Tutar</th>
                {isSuperAdmin && <th className="table-header text-right px-4 py-3">İşlem</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-black-border">
              {transactions.length > 0 ? transactions.map((t: any) => (
                <tr key={t.id} className="hover:bg-brand-black-border/30 transition-colors group">
                  <td className="px-4 py-3 text-xs text-brand-white-dim">
                    {format(new Date(t.date), 'd MMM yyyy', { locale: tr })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={t.type === 'income' ? 'badge-green' : 'badge-red'}>
                      {t.type === 'income' ? 'Gelir' : 'Gider'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-white-muted">{t.category}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {/* Fatura bağlantısı varsa tıklanabilir yap */}
                    {t.invoice_id ? (
                      <Link
                        href={`/finance/invoices/${t.invoice_id}`}
                        className="flex items-center gap-1.5 text-sm text-brand-red hover:text-brand-red-light transition-colors group/link"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{t.description}</span>
                        <span className="text-xs text-brand-white-dim opacity-0 group-hover/link:opacity-100 transition-opacity">
                          ({t.invoice?.invoice_number})
                        </span>
                      </Link>
                    ) : (
                      <span className="text-sm text-brand-white-muted">{t.description}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-white-muted hidden lg:table-cell">
                    {t.client?.company_name || '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}₺{t.amount.toLocaleString('tr-TR')}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right">
                      {!t.invoice_id && (
  <button
    onClick={() => { setDeleteTarget(t); setShowDeleteModal(true) }}
    className="text-brand-white-dim hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-400/10"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
)}
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-12 text-center text-brand-white-dim">
                    Henüz kayıt yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kayıt Ekle Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Yeni Kayıt</h2>
              <button onClick={() => setShowModal(false)} className="text-brand-white-dim hover:text-brand-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => set('type', 'income')} className={`py-2 rounded-lg text-sm font-semibold transition-all ${form.type === 'income' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-brand-black border border-brand-black-border text-brand-white-muted'}`}>
                  + Gelir
                </button>
                <button type="button" onClick={() => set('type', 'expense')} className={`py-2 rounded-lg text-sm font-semibold transition-all ${form.type === 'expense' ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-brand-black border border-brand-black-border text-brand-white-muted'}`}>
                  - Gider
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tutar (₺) *</label>
                  <input type="number" className="input" value={form.amount} onChange={e => set('amount', e.target.value)} min="0" step="0.01" required placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Tarih</label>
                  <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Kategori *</label>
                <select className="select" value={form.category} onChange={e => set('category', e.target.value)} required>
                  <option value="">Seçin...</option>
                  {(form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Açıklama *</label>
                <input className="input" value={form.description} onChange={e => set('description', e.target.value)} required placeholder="Açıklama..." />
              </div>
              <div>
                <label className="label">Müşteri</label>
                <select className="select" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                  <option value="">İlişkili müşteri yok</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-white">Kaydı Sil</h2>
                <p className="text-xs text-brand-white-dim">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-white-muted">{deleteTarget.description}</span>
                <span className={`text-sm font-semibold ${deleteTarget.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {deleteTarget.type === 'income' ? '+' : '-'}₺{deleteTarget.amount.toLocaleString('tr-TR')}
                </span>
              </div>
              <p className="text-xs text-brand-white-dim">{format(new Date(deleteTarget.date), 'd MMMM yyyy', { locale: tr })}</p>
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
              <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null) }} className="btn-secondary">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
