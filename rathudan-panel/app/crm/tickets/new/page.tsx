'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewTicketPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [clients, setClients] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [form, setForm] = useState({
    client_id: searchParams.get('client') || '',
    assigned_to: '',
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    category: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: c }, { data: e }] = await Promise.all([
        supabase.from('clients').select('id, company_name').eq('is_active', true).order('company_name'),
        supabase.from('profiles').select('id, full_name').in('role', ['admin', 'super_admin', 'employee']).eq('is_active', true),
      ])
      setClients(c || [])
      setEmployees(e || [])
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('tickets').insert([{
      ...form,
      created_by: user.id,
      assigned_to: form.assigned_to || null,
    }])

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/crm/tickets')
    }
  }

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/crm/tickets" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Link>
        <h1 className="page-title">Yeni Destek Bileti</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Müşteri *</label>
            <select className="select" value={form.client_id} onChange={(e) => set('client_id', e.target.value)} required>
              <option value="">Müşteri seçin...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Atanan Çalışan</label>
            <select className="select" value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">Atanmadı</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Öncelik</label>
            <select className="select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
              <option value="urgent">Acil</option>
            </select>
          </div>
          <div>
            <label className="label">Kategori</label>
            <input className="input" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Teknik destek, Fatura..." />
          </div>
        </div>

        <div>
          <label className="label">Başlık *</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Sorunu kısaca açıklayın..." />
        </div>

        <div>
          <label className="label">Açıklama *</label>
          <textarea className="input min-h-[120px] resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} required placeholder="Sorunu detaylı açıklayın..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
          <Link href="/crm/tickets" className="btn-secondary">İptal</Link>
        </div>
      </form>
    </div>
  )
}
