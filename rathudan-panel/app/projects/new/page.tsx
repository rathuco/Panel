'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, X, Crown } from 'lucide-react'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [leaderId, setLeaderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    notes: '',
    client_id: '',
    status: 'planning',
    start_date: '',
    deadline: '',
    budget: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: cl }, { data: users }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('clients').select('id, company_name').eq('is_active', true).order('company_name'),
        supabase.from('profiles').select('id, full_name, role').eq('is_active', true).neq('role', 'client').order('full_name'),
      ])

      setCurrentUser(prof)
      setClients(cl || [])
      setAllUsers(users || [])
    }
    fetchData()
  }, [])

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
    if (leaderId === userId && selectedMembers.includes(userId)) {
      setLeaderId('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMembers.length === 0) {
      setError('En az bir ekip üyesi eklemelisiniz.')
      return
    }
    if (!leaderId) {
      setError('Proje Başkanı seçmelisiniz.')
      return
    }

    setLoading(true)
    setError('')

    const { data: project, error: projError } = await supabase
      .from('projects')
      .insert([{
        name: form.name,
        description: form.description || null,
        notes: form.notes || null,
        client_id: form.client_id || null,
        status: form.status,
        start_date: form.start_date || null,
        deadline: form.deadline || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        manager_id: currentUser?.id,
      }])
      .select()
      .single()

    if (projError || !project) {
      setError(projError?.message || 'Proje oluşturulamadı')
      setLoading(false)
      return
    }

    // Ekip üyelerini ekle
    await supabase.from('project_members').insert(
      selectedMembers.map(userId => ({
        project_id: project.id,
        user_id: userId,
        is_leader: userId === leaderId,
      }))
    )

    setLoading(false)
    router.push(`/projects/${project.id}`)
  }

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const roleLabel: Record<string, string> = {
    super_admin: 'Süper Admin', admin: 'Yönetici', employee: 'Çalışan'
  }

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/projects" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Geri
        </Link>
        <h1 className="page-title">Yeni Proje</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Proje Bilgileri */}
        <div className="card space-y-4">
          <h2 className="section-title">Proje Bilgileri</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Proje Adı *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Proje adını girin..." />
            </div>
            <div>
              <label className="label">Müşteri</label>
              <select className="select" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                <option value="">İç proje</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Durum</label>
              <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="planning">Planlama</option>
                <option value="active">Aktif</option>
                <option value="on_hold">Beklemede</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal</option>
              </select>
            </div>
            <div>
              <label className="label">Başlangıç Tarihi</label>
              <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Bitiş Tarihi</label>
              <input type="date" className="input" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Bütçe (₺)</label>
              <input type="number" className="input" value={form.budget} onChange={e => set('budget', e.target.value)} min="0" placeholder="0" />
            </div>
          </div>

          <div>
            <label className="label">Proje Açıklaması</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Proje hakkında kısa açıklama..." />
          </div>

          <div>
            <label className="label">Proje Notları</label>
            <textarea className="input resize-none" rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Proje notları, önemli bilgiler..." />
          </div>
        </div>

        {/* Ekip */}
        <div className="card space-y-4">
          <div>
            <h2 className="section-title">Proje Ekibi</h2>
            <p className="text-xs text-brand-white-dim mt-1">Ekip üyelerini seçin, ardından Proje Başkanını belirleyin.</p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allUsers.map(user => {
              const isMember = selectedMembers.includes(user.id)
              const isLeader = leaderId === user.id

              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isMember
                      ? 'bg-brand-red/5 border-brand-red/30'
                      : 'bg-brand-black border-brand-black-border hover:border-brand-black-border/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleMember(user.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isMember ? 'bg-brand-red border-brand-red' : 'border-brand-black-border'
                      }`}
                    >
                      {isMember && <span className="text-white text-xs">✓</span>}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-brand-white">{user.full_name}</p>
                      <p className="text-xs text-brand-white-dim">{roleLabel[user.role]}</p>
                    </div>
                  </div>

                  {isMember && (
                    <button
                      type="button"
                      onClick={() => setLeaderId(isLeader ? '' : user.id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                        isLeader
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                          : 'bg-brand-black-border text-brand-white-dim hover:text-brand-white'
                      }`}
                    >
                      <Crown className="w-3 h-3" />
                      {isLeader ? 'Başkan' : 'Başkan Yap'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {selectedMembers.length > 0 && (
            <div className="bg-brand-black border border-brand-black-border rounded-xl p-3">
              <p className="text-xs text-brand-white-dim mb-2">Seçilen ekip ({selectedMembers.length} kişi)</p>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map(id => {
                  const u = allUsers.find(u => u.id === id)
                  return (
                    <span key={id} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${
                      id === leaderId ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-brand-black-border text-brand-white-muted'
                    }`}>
                      {id === leaderId && <Crown className="w-3 h-3" />}
                      {u?.full_name}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Proje Oluştur
          </button>
          <Link href="/projects" className="btn-secondary">İptal</Link>
        </div>
      </form>
    </div>
  )
}
