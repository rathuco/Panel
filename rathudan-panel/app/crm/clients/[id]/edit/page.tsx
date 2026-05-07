'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, AlertTriangle } from 'lucide-react'

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [employees, setEmployees] = useState<any[]>([])
  const [form, setForm] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [clientName, setClientName] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: prof }, { data: client }, { data: emp }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user!.id).single(),
        supabase.from('clients').select('*').eq('id', params.id).single(),
        supabase.from('profiles').select('id, full_name').in('role', ['admin', 'super_admin', 'employee']).eq('is_active', true),
      ])
      setProfile(prof)
      if (client) { setForm(client); setClientName(client.company_name) }
      setEmployees(emp || [])
    }
    fetchData()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('clients').update(form).eq('id', params.id)
    if (error) { setError(error.message); setLoading(false) }
    else router.push(`/crm/clients/${params.id}`)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('clients').delete().eq('id', params.id)
    setDeleting(false)
    router.push('/crm/clients')
  }

  const set = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }))

  const isSuperAdmin = profile?.role === 'super_admin'

  if (!form) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/crm/clients/${params.id}`} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Geri
        </Link>
        <h1 className="page-title">Müşteriyi Düzenle</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Firma Adı *</label>
            <input className="input" value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Yetkili Ad Soyad *</label>
            <input className="input" value={form.contact_name || ''} onChange={e => set('contact_name', e.target.value)} required />
          </div>
          <div>
            <label className="label">E-posta *</label>
            <input className="input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} required />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input className="input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Şehir</label>
            <input className="input" value={form.city || ''} onChange={e => set('city', e.target.value)} />
          </div>
          <div>
            <label className="label">Vergi No</label>
            <input className="input" value={form.tax_number || ''} onChange={e => set('tax_number', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Sorumlu Çalışan</label>
            <select className="select" value={form.assigned_employee_id || ''} onChange={e => set('assigned_employee_id', e.target.value || null)}>
              <option value="">Atanmadı</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Adres</label>
          <input className="input" value={form.address || ''} onChange={e => set('address', e.target.value)} />
        </div>

        <div>
          <label className="label">Notlar</label>
          <textarea className="input min-h-[80px] resize-none" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
        </div>

        {/* Aktif tik + Sil butonu */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-brand-red"
            />
            <label htmlFor="is_active" className="text-sm text-brand-white-muted">
              Aktif müşteri
            </label>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Müşteriyi Sil
            </button>
          )}
        </div>

        <div className="flex gap-3 pt-2 border-t border-brand-black-border">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />
            }
            Kaydet
          </button>
          <Link href={`/crm/clients/${params.id}`} className="btn-secondary">İptal</Link>
        </div>
      </form>

      {/* Silme Onay Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-white">Müşteriyi Sil</h2>
                <p className="text-xs text-brand-white-dim">Bu işlem geri alınamaz</p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5">
              <p className="text-sm text-brand-white-muted">
                <span className="font-semibold text-brand-white">{clientName}</span> adlı müşteri ve tüm ilişkili veriler kalıcı olarak silinecek.
              </p>
            </div>

            <div className="mb-5">
              <label className="label">
                Onaylamak için <span className="text-brand-white font-bold">"{clientName}"</span> yazın
              </label>
              <input
                className="input"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={clientName}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== clientName || deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm"
              >
                {deleting
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
                Kalıcı Olarak Sil
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                className="btn-secondary"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
