'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [employees, setEmployees] = useState<any[]>([])
  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: client }, { data: emp }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', params.id).single(),
        supabase.from('profiles').select('id, full_name').in('role', ['admin', 'super_admin', 'employee']).eq('is_active', true),
      ])
      if (client) setForm(client)
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

  const set = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }))

  if (!form) return <div className="p-6 text-brand-white-dim">Yükleniyor...</div>

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/crm/clients/${params.id}`} className="btn-ghost"><ArrowLeft className="w-4 h-4" />Geri</Link>
        <h1 className="page-title">Müşteriyi Düzenle</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}

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

        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-brand-red" />
          <label htmlFor="is_active" className="text-sm text-brand-white-muted">Aktif müşteri</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
          <Link href={`/crm/clients/${params.id}`} className="btn-secondary">İptal</Link>
        </div>
      </form>
    </div>
  )
}
