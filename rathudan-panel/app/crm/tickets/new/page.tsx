'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

function NewTicketForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [clientRecord, setClientRecord] = useState<any>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [form, setForm] = useState({
    client_id: searchParams.get('client') || '',
    title: '',
    description: '',
    priority: 'medium',
    category: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const isClientRole = prof?.role === 'client'

      if (isClientRole) {
        // Müşterinin kendi client kaydını bul
        const { data: cr } = await supabase
          .from('clients')
          .select('id, company_name')
          .eq('email', prof.email)
          .single()
        setClientRecord(cr)
        if (cr) setForm(f => ({ ...f, client_id: cr.id }))
      } else {
        // Admin/employee — tüm müşterileri ve çalışanları getir
        const [{ data: c }, { data: e }] = await Promise.all([
          supabase.from('clients').select('id, company_name').eq('is_active', true).order('company_name'),
          supabase.from('profiles').select('id, full_name').in('role', ['admin', 'super_admin', 'employee']).eq('is_active', true),
        ])
        setClients(c || [])
        setEmployees(e || [])
        if (searchParams.get('client')) {
          setForm(f => ({ ...f, client_id: searchParams.get('client') || '' }))
        }
      }

      setPageLoading(false)
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isClientRole = profile?.role === 'client'

    const { error } = await supabase.from('tickets').insert([{
      client_id: form.client_id,
      created_by: user.id,
      assigned_to: null, // Admin sonradan atar
      title: form.title,
      description: form.description,
      status: 'open',
      priority: isClientRole ? 'medium' : form.priority,
      category: form.category || null,
    }])

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/crm/tickets')
    }
  }

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  if (pageLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  const isClientRole = profile?.role === 'client'

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/crm/tickets" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Link>
        <h1 className="page-title">
          {isClientRole ? 'Destek Talebi Oluştur' : 'Yeni Destek Bileti'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Müşteri rolü — firma bilgisi otomatik */}
        {isClientRole && clientRecord && (
          <div className="bg-brand-black border border-brand-black-border rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-brand-white-dim">Firma</span>
            <span className="text-sm font-semibold text-brand-white">{clientRecord.company_name}</span>
          </div>
        )}

        {/* Admin/Employee — müşteri ve çalışan seçimi */}
        {!isClientRole && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Müşteri *</label>
              <select
                className="select"
                value={form.client_id}
                onChange={e => set('client_id', e.target.value)}
                required
              >
                <option value="">Müşteri seçin...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Öncelik</label>
              <select className="select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="urgent">Acil</option>
              </select>
            </div>
          </div>
        )}

        {/* Kategori — herkese göster */}
        <div>
          <label className="label">Kategori</label>
          <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Seçin...</option>
            <option value="Teknik Destek">Teknik Destek</option>
            <option value="Fatura">Fatura</option>
            <option value="Web Sitesi">Web Sitesi</option>
            <option value="Sosyal Medya">Sosyal Medya</option>
            <option value="Tasarım">Tasarım</option>
            <option value="Yazılım">Yazılım</option>
            <option value="Genel">Genel</option>
          </select>
        </div>

        <div>
          <label className="label">Başlık *</label>
          <input
            className="input"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            required
            placeholder={isClientRole ? 'Talebinizi kısaca açıklayın...' : 'Sorunu kısaca açıklayın...'}
          />
        </div>

        <div>
          <label className="label">Açıklama *</label>
          <textarea
            className="input min-h-[120px] resize-none"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            required
            placeholder={isClientRole ? 'Talebinizi detaylı açıklayın...' : 'Sorunu detaylı açıklayın...'}
          />
        </div>

        {/* Müşteri rolü için bilgi notu */}
        {isClientRole && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-400">
              Talebiniz ekibimize iletilecek ve en kısa sürede size geri dönüş yapılacaktır.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />
            }
            {isClientRole ? 'Talebi Gönder' : 'Kaydet'}
          </button>
          <Link href="/crm/tickets" className="btn-secondary">İptal</Link>
        </div>
      </form>
    </div>
  )
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
      </div>
    }>
      <NewTicketForm />
    </Suspense>
  )
}
