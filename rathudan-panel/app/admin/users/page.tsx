'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Plus, X, Save, Users, UserPlus, Trash2, AlertTriangle } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function UsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  const [userForm, setUserForm] = useState({
    email: '', full_name: '', role: 'employee', phone: '', department: '', password: '',
  })
  const [clientForm, setClientForm] = useState({
    email: '', full_name: '', phone: '', password: '',
    company_name: '', city: '', tax_number: '', notes: '',
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

  const staff = users.filter(u => u.role !== 'client')
  const clients = users.filter(u => u.role === 'client')

  const handleCreateUser = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: userForm.email,
    password: userForm.password,
    options: {
      data: { full_name: userForm.full_name, role: userForm.role }
    }
  })

  if (signUpError) {
    setError(signUpError.message)
    setLoading(false)
    return
  }

  if (signUpData.user) {
    // Profili direkt upsert et — trigger'a güvenme
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: signUpData.user.id,
      email: userForm.email,
      full_name: userForm.full_name,
      role: userForm.role,  // Burada doğru rol atanıyor
      phone: userForm.phone || null,
      department: userForm.department || null,
      is_active: true,
    }, { onConflict: 'id' })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }
  }

  setLoading(false)
  setShowUserModal(false)
  setUserForm({ email: '', full_name: '', role: 'employee', phone: '', department: '', password: '' })
  fetchAll()
}

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: clientForm.email,
      password: clientForm.password,
      options: { data: { full_name: clientForm.full_name, role: 'client' } }
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (signUpData.user) {
      await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        email: clientForm.email,
        full_name: clientForm.full_name,
        role: 'client',
        phone: clientForm.phone || null,
        is_active: true,
      })

      await supabase.from('clients').insert({
        company_name: clientForm.company_name,
        contact_name: clientForm.full_name,
        email: clientForm.email,
        phone: clientForm.phone || null,
        city: clientForm.city || null,
        tax_number: clientForm.tax_number || null,
        notes: clientForm.notes || null,
        is_active: true,
      })
    }

    setLoading(false)
    setShowClientModal(false)
    setClientForm({ email: '', full_name: '', phone: '', password: '', company_name: '', city: '', tax_number: '', notes: '' })
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

  const openDeleteModal = (user: any) => {
    setDeleteTarget(user)
    setDeleteConfirmText('')
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteConfirmText !== deleteTarget.full_name) return
    setDeleteLoading(true)

    // Profiles tablosundan sil
    await supabase.from('profiles').delete().eq('id', deleteTarget.id)

    setDeleteLoading(false)
    setShowDeleteModal(false)
    setDeleteTarget(null)
    setDeleteConfirmText('')
    fetchAll()
  }

  const setUser = (field: string, value: any) => setUserForm(f => ({ ...f, [field]: value }))
  const setClient = (field: string, value: any) => setClientForm(f => ({ ...f, [field]: value }))

  const StaffTable = () => (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-black-border">
        <h2 className="section-title flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-brand-red" />
          Personel ({staff.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-black-border">
              <th className="table-header text-left px-4 py-3">Personel</th>
              <th className="table-header text-left px-4 py-3">Rol</th>
              <th className="table-header text-left px-4 py-3 hidden md:table-cell">Departman</th>
              <th className="table-header text-left px-4 py-3">Durum</th>
              <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Kayıt</th>
              {isSuperAdmin && <th className="table-header text-right px-4 py-3">İşlem</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-black-border">
            {staff.length > 0 ? staff.map(u => (
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
                    </select>
                  ) : (
                    <StatusBadge status={u.role} type="role" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-brand-white-muted hidden md:table-cell">{u.department || '—'}</td>
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
            )) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-brand-white-dim text-sm">Personel bulunamadı</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const ClientTable = () => (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-black-border">
        <h2 className="section-title flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-red" />
          Müşteri Hesapları ({clients.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-black-border">
              <th className="table-header text-left px-4 py-3">Müşteri</th>
              <th className="table-header text-left px-4 py-3 hidden md:table-cell">Telefon</th>
              <th className="table-header text-left px-4 py-3">Durum</th>
              <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Kayıt</th>
              {isSuperAdmin && <th className="table-header text-right px-4 py-3">İşlem</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-black-border">
            {clients.length > 0 ? clients.map(u => (
              <tr key={u.id} className="hover:bg-brand-black-border/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-400">{u.full_name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-white">{u.full_name}</p>
                      <p className="text-xs text-brand-white-dim">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-brand-white-muted hidden md:table-cell">{u.phone || '—'}</td>
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
                    <button
                      onClick={() => openDeleteModal(u)}
                      className="text-xs px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-all flex items-center gap-1.5 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Sil
                    </button>
                  </td>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-brand-white-dim text-sm">Müşteri hesabı bulunamadı</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-red" />
            Kullanıcı Yönetimi
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">{users.length} toplam kullanıcı</p>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowClientModal(true)} className="btn-secondary">
              <Users className="w-4 h-4" />
              Müşteri Ekle
            </button>
            <button onClick={() => setShowUserModal(true)} className="btn-primary">
              <UserPlus className="w-4 h-4" />
              Personel Ekle
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
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

      {/* Personel tablosu */}
      <StaffTable />

      {/* Müşteri tablosu */}
      <ClientTable />

      {/* Personel Ekle Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-red" />
                Yeni Personel
              </h2>
              <button onClick={() => { setShowUserModal(false); setError('') }} className="text-brand-white-dim hover:text-brand-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">{error}</div>}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="label">Ad Soyad *</label>
                <input className="input" value={userForm.full_name} onChange={e => setUser('full_name', e.target.value)} required placeholder="Ahmet Yılmaz" />
              </div>
              <div>
                <label className="label">E-posta *</label>
                <input type="email" className="input" value={userForm.email} onChange={e => setUser('email', e.target.value)} required placeholder="ahmet@rathudan.com" />
              </div>
              <div>
                <label className="label">Şifre *</label>
                <input type="password" className="input" value={userForm.password} onChange={e => setUser('password', e.target.value)} required placeholder="En az 6 karakter" minLength={6} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Rol</label>
                  <select className="select" value={userForm.role} onChange={e => setUser('role', e.target.value)}>
                    <option value="super_admin">Süper Admin</option>
                    <option value="admin">Yönetici</option>
                    <option value="employee">Çalışan</option>
                  </select>
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input className="input" value={userForm.phone} onChange={e => setUser('phone', e.target.value)} placeholder="+90 555..." />
                </div>
              </div>
              <div>
                <label className="label">Departman</label>
                <input className="input" value={userForm.department} onChange={e => setUser('department', e.target.value)} placeholder="Tasarım, Yazılım..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Oluştur
                </button>
                <button type="button" onClick={() => { setShowUserModal(false); setError('') }} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Müşteri Ekle Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-red" />
                Yeni Müşteri Hesabı
              </h2>
              <button onClick={() => { setShowClientModal(false); setError('') }} className="text-brand-white-dim hover:text-brand-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">{error}</div>}
            <form onSubmit={handleCreateClient} className="space-y-4">
              <p className="text-xs text-brand-white-dim border-b border-brand-black-border pb-2">Giriş Bilgileri</p>
              <div>
                <label className="label">Ad Soyad (Yetkili) *</label>
                <input className="input" value={clientForm.full_name} onChange={e => setClient('full_name', e.target.value)} required placeholder="Mehmet Demir" />
              </div>
              <div>
                <label className="label">E-posta *</label>
                <input type="email" className="input" value={clientForm.email} onChange={e => setClient('email', e.target.value)} required placeholder="info@firma.com" />
              </div>
              <div>
                <label className="label">Şifre *</label>
                <input type="password" className="input" value={clientForm.password} onChange={e => setClient('password', e.target.value)} required placeholder="En az 6 karakter" minLength={6} />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input className="input" value={clientForm.phone} onChange={e => setClient('phone', e.target.value)} placeholder="+90 555..." />
              </div>
              <p className="text-xs text-brand-white-dim border-b border-brand-black-border pb-2 pt-2">Firma Bilgileri</p>
              <div>
                <label className="label">Firma Adı *</label>
                <input className="input" value={clientForm.company_name} onChange={e => setClient('company_name', e.target.value)} required placeholder="Örnek A.Ş." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Şehir</label>
                  <input className="input" value={clientForm.city} onChange={e => setClient('city', e.target.value)} placeholder="Bursa" />
                </div>
                <div>
                  <label className="label">Vergi No</label>
                  <input className="input" value={clientForm.tax_number} onChange={e => setClient('tax_number', e.target.value)} placeholder="1234567890" />
                </div>
              </div>
              <div>
                <label className="label">Notlar</label>
                <textarea className="input resize-none" rows={2} value={clientForm.notes} onChange={e => setClient('notes', e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Oluştur
                </button>
                <button type="button" onClick={() => { setShowClientModal(false); setError('') }} className="btn-secondary">İptal</button>
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
                <h2 className="text-base font-bold text-brand-white">Müşteriyi Sil</h2>
                <p className="text-xs text-brand-white-dim">Bu işlem geri alınamaz</p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5">
              <p className="text-sm text-brand-white-muted">
                <span className="font-semibold text-brand-white">{deleteTarget.full_name}</span> adlı müşterinin hesabı kalıcı olarak silinecek. Bu müşteriye ait tüm veriler etkilenebilir.
              </p>
            </div>

            <div className="mb-5">
              <label className="label">
                Onaylamak için <span className="text-brand-white font-bold">"{deleteTarget.full_name}"</span> yazın
              </label>
              <input
                className="input"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget.full_name}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== deleteTarget.full_name || deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm"
              >
                {deleteLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Kalıcı Olarak Sil
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); setDeleteConfirmText('') }}
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
