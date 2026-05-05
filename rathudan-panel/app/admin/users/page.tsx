'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Plus, X, Save } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function UsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '', full_name: '', role: 'employee', phone: '', department: '', password: '',
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: prof }, { data: u }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ])
    setProfile(prof)
    setUsers(u || [])
  }

  const isSuperAdmin = profile?.role === 'super_admin'

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1. Auth üzerinden kullanıcı oluştur
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: form.role,
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 2. Profiles tablosunu güncelle
    if (signUpData.user) {
      await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        phone: form.phone || null,
        department: form.department || null,
        is_active: true,
      })
    }

    setLoading(false)
    setShowModal(false)
    setForm({ email: '', full_name: '', role: 'employee', phone: '', department: '', password: '' })
    fetchAll()
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchAll()
  }

  const handleToggleActive = async (userId: string, currentState: boolean) => {
    await supabase.from('profiles').update({ is_active: !currentState }).eq('id', userId)
    fetchAll()
  }

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-red" />
            Kullanıcı Yönetimi
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">{users.length} kullanıcı</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Kullanıcı Ekle
          </button>
        )}
      </div>

      {/* Role overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['super_admin', 'admin', 'employee', 'client'] as const).map(role => {
          const count = users.filter(u => u.role === role).length
          const labels = { super_admin: 'Süper Admin', admin: 'Yönetici', employee: 'Çalışan', client: 'Müşteri' }
          return (
            <div key={role} className="card py-3 flex items-center justify-between">
              <span className="text-sm text-brand-white-muted">{labels[role]}</span>
              <span className="text-xl font-black text-brand-white">{count}</span>
            </div>
          )
        })}
      </div>

      {/* Users table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-black-border">
                <th className="table-header text-left px-4 py-3">Kullanıcı</th>
                <th className="table-header text-left px-4 py-3">Rol</th>
                <th className="table-header text-left px-4 py-3 hidden md:table-cell">Departman</th>
                <th className="table-header text-left px-4 py-3">Durum</th>
                <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Kayıt</th>
                {isSuperAdmin && <th className="table-header text-right px-4 py-3">İşlem</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-black-border">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-brand-black-border/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-red/10 border border-brand-red/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-red">{u.full_name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-white">{u.full_name}</p>
                        <p className="text-xs text-brand-white-dim">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isSuperAdmin && u.id !== profile?.id ? (
                      <select
                        className="bg-brand-black border border-brand-black-border rounded text-xs px-2 py-1 text-brand-white focus:outline-none focus:border-brand-red"
                        value={u.role}
                        onChange={e => handleUpdateRole(u.id, e.target.value)}
                      >
                        <option value="super_admin">Süper Admin</option>
                        <option value="admin">Yönetici</option>
                        <option value="employee">Çalışan</option>
                        <option value="client">Müşteri</option>
                      </select>
                    ) : (
                      <StatusBadge status={u.role} type="role" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-white-muted hidden md:table-cell">
                    {u.department || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.is_active ? 'badge-green' : 'badge-gray'}>
                      {u.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-white-dim hidden lg:table-cell">
                    {format(new Date(u.created_at), 'd MMM yyyy', { locale: tr })}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right">
                      {u.id !== profile?.id && (
                        <button
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-all ${u.is_active ? 'text-red-400 hover:bg-red-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
                        >
                          {u.is_active ? 'Devre Dışı' : 'Aktifleştir'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Yeni Kullanıcı</h2>
              <button onClick={() => { setShowModal(false); setError('') }} className="text-brand-white-dim hover:text-brand-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Ad Soyad *</label>
                <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="Ahmet Yılmaz" />
              </div>
              <div>
                <label className="label">E-posta *</label>
                <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="ornek@rathudan.com" />
              </div>
              <div>
                <label className="label">Şifre *</label>
                <input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} required placeholder="En az 6 karakter" minLength={6} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Rol</label>
                  <select className="select" value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="super_admin">Süper Admin</option>
                    <option value="admin">Yönetici</option>
                    <option value="employee">Çalışan</option>
                    <option value="client">Müşteri</option>
                  </select>
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+90 555..." />
                </div>
              </div>
              <div>
                <label className="label">Departman</label>
                <input className="input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="Tasarım, Yazılım..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Kullanıcı Oluştur
                </button>
                <button type="button" onClick={() => { setShowModal(false); setError('') }} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
