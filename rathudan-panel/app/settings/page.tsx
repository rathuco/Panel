'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Settings, User, Shield, Bell, Users, ChevronRight,
  Save, Check, X, Plus, Trash2, AlertTriangle, RefreshCw,
  Eye, EyeOff, Key, Phone,
} from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

type Tab = 'profile' | 'users' | 'roles' | 'notifications'

// Sabit rol tanımları ve yetkileri
const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: {
    view_clients: true,
    manage_clients: true,
    view_tickets: true,
    manage_tickets: true,
    view_invoices: true,
    manage_invoices: true,
    view_transactions: true,
    manage_transactions: true,
    view_packages: true,
    manage_packages: true,
    view_projects: true,
    manage_projects: true,
    view_meetings: true,
    manage_meetings: true,
    view_reports: true,
    view_users: true,
  },
  employee: {
    view_clients: true,
    manage_clients: false,
    view_tickets: true,
    manage_tickets: true,
    view_invoices: true,
    manage_invoices: false,
    view_transactions: false,
    manage_transactions: false,
    view_packages: true,
    manage_packages: false,
    view_projects: true,
    manage_projects: true,
    view_meetings: true,
    manage_meetings: true,
    view_reports: false,
    view_users: false,
  },
  client: {
    view_clients: false,
    manage_clients: false,
    view_tickets: true,
    manage_tickets: true,
    view_invoices: true,
    manage_invoices: false,
    view_transactions: false,
    manage_transactions: false,
    view_packages: true,
    manage_packages: false,
    view_projects: false,
    manage_projects: false,
    view_meetings: false,
    manage_meetings: false,
    view_reports: false,
    view_users: false,
  },
}

const PERMISSION_LABELS: Record<string, string> = {
  view_clients: 'Müşterileri Görüntüle',
  manage_clients: 'Müşterileri Yönet',
  view_tickets: 'Biletleri Görüntüle',
  manage_tickets: 'Biletleri Yönet',
  view_invoices: 'Faturaları Görüntüle',
  manage_invoices: 'Faturaları Yönet',
  view_transactions: 'Gelir/Gideri Görüntüle',
  manage_transactions: 'Gelir/Gideri Yönet',
  view_packages: 'Paketleri Görüntüle',
  manage_packages: 'Paketleri Yönet',
  view_projects: 'Projeleri Görüntüle',
  manage_projects: 'Projeleri Yönet',
  view_meetings: 'Görüşmeleri Görüntüle',
  manage_meetings: 'Görüşmeleri Yönet',
  view_reports: 'Raporları Görüntüle',
  view_users: 'Kullanıcıları Görüntüle',
}

const PERMISSION_GROUPS = [
  { label: 'Müşteriler', keys: ['view_clients', 'manage_clients'] },
  { label: 'Destek Biletleri', keys: ['view_tickets', 'manage_tickets'] },
  { label: 'Faturalar', keys: ['view_invoices', 'manage_invoices'] },
  { label: 'Gelir/Gider', keys: ['view_transactions', 'manage_transactions'] },
  { label: 'Paketler', keys: ['view_packages', 'manage_packages'] },
  { label: 'Projeler', keys: ['view_projects', 'manage_projects'] },
  { label: 'Görüşmeler', keys: ['view_meetings', 'manage_meetings'] },
  { label: 'Raporlar', keys: ['view_reports'] },
  { label: 'Kullanıcılar', keys: ['view_users'] },
]

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)

  // Profile state
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

  // Users state
  const [users, setUsers] = useState<any[]>([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showRoleConfirm, setShowRoleConfirm] = useState(false)
  const [roleTarget, setRoleTarget] = useState<any>(null)
  const [pendingRole, setPendingRole] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [userSubmitting, setUserSubmitting] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)
  const [userError, setUserError] = useState('')
  const [userForm, setUserForm] = useState({ email: '', full_name: '', role: 'employee', phone: '', department: '', password: '' })
  const [clientForm, setClientForm] = useState({ email: '', full_name: '', phone: '', password: '', company_name: '', city: '', tax_number: '', notes: '' })

  // Roles state
  const [rolePermissions, setRolePermissions] = useState(DEFAULT_ROLE_PERMISSIONS)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee' | 'client'>('admin')
  const [rolesSaved, setRolesSaved] = useState(false)

  // Notifications state
  const [notifPrefs, setNotifPrefs] = useState({
    new_ticket: true,
    ticket_reply: true,
    ticket_resolved: false,
    new_invoice: true,
    invoice_overdue: true,
    new_meeting: false,
    task_assigned: true,
  })
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: prof }, { data: u }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').order('role').order('full_name'),
    ])
    setProfile(prof)
    setProfileForm({ full_name: prof?.full_name || '', phone: prof?.phone || '' })
    setUsers(u || [])
    setLoading(false)
  }

  const isSuperAdmin = profile?.role === 'super_admin'
  const staff = users.filter(u => u.role !== 'client')
  const clients = users.filter(u => u.role === 'client')

  // ── PROFILE ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg({ type: '', text: '' })
    const { error } = await supabase.from('profiles').update({
      full_name: profileForm.full_name,
      phone: profileForm.phone || null,
    }).eq('id', profile.id)
    setProfileSaving(false)
    if (error) setProfileMsg({ type: 'error', text: error.message })
    else { setProfileMsg({ type: 'success', text: 'Profil bilgileri güncellendi.' }); fetchAll() }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg({ type: '', text: '' })
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg({ type: 'error', text: 'Şifreler eşleşmiyor.' }); return
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Şifre en az 6 karakter olmalı.' }); return
    }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password })
    setPasswordSaving(false)
    if (error) setPasswordMsg({ type: 'error', text: error.message })
    else { setPasswordMsg({ type: 'success', text: 'Şifreniz güncellendi.' }); setPasswordForm({ new_password: '', confirm_password: '' }) }
  }

  // ── USERS ──
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserSubmitting(true); setUserError('')
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userForm.email, password: userForm.password, full_name: userForm.full_name, role: userForm.role, phone: userForm.phone || null, department: userForm.department || null }),
      })
      const result = await res.json()
      if (!res.ok) { setUserError(result.error || 'Hata'); setUserSubmitting(false); return }
      setUserSubmitting(false); setShowUserModal(false)
      setUserForm({ email: '', full_name: '', role: 'employee', phone: '', department: '', password: '' })
      fetchAll()
    } catch (err: any) { setUserError(err.message); setUserSubmitting(false) }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserSubmitting(true); setUserError('')
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clientForm.email, password: clientForm.password, full_name: clientForm.full_name, role: 'client', phone: clientForm.phone || null, company_name: clientForm.company_name, city: clientForm.city || null, tax_number: clientForm.tax_number || null, notes: clientForm.notes || null }),
      })
      const result = await res.json()
      if (!res.ok) { setUserError(result.error || 'Hata'); setUserSubmitting(false); return }
      setUserSubmitting(false); setShowClientModal(false)
      setClientForm({ email: '', full_name: '', phone: '', password: '', company_name: '', city: '', tax_number: '', notes: '' })
      fetchAll()
    } catch (err: any) { setUserError(err.message); setUserSubmitting(false) }
  }

  const requestRoleChange = (user: any, newRole: string) => {
    if (newRole === user.role) return
    setRoleTarget(user); setPendingRole(newRole); setShowRoleConfirm(true)
  }

  const confirmRoleChange = async () => {
    if (!roleTarget || !pendingRole) return
    setRoleLoading(true)
    await supabase.from('profiles').update({ role: pendingRole }).eq('id', roleTarget.id)
    setRoleLoading(false); setShowRoleConfirm(false); setRoleTarget(null); setPendingRole(''); fetchAll()
  }

  const handleToggleActive = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', userId); fetchAll()
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.full_name) return
    setDeleteLoading(true)
    await supabase.from('profiles').delete().eq('id', deleteTarget.id)
    setDeleteLoading(false); setShowDeleteModal(false); setDeleteTarget(null); setDeleteConfirmText(''); fetchAll()
  }

  // ── ROLES ──
  const togglePermission = (role: string, perm: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role][perm] }
    }))
  }

  const handleSaveRoles = async () => {
    // Burada gerçek bir DB kaydı yapılabilir, şimdilik local state'de tutuluyor
    setRolesSaved(true)
    setTimeout(() => setRolesSaved(false), 2000)
  }

  // ── NOTIFICATIONS ──
  const handleSaveNotif = async () => {
    setNotifSaving(true)
    await new Promise(r => setTimeout(r, 500)) // simüle kayıt
    setNotifSaving(false); setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 2000)
  }

  const ROLE_LABELS: Record<string, string> = { super_admin: 'Süper Admin', admin: 'Yönetici', employee: 'Çalışan', client: 'Müşteri' }

  const tabs: { key: Tab; label: string; icon: React.ElementType; roles: string[] }[] = [
    { key: 'profile', label: 'Profilim', icon: User, roles: ['super_admin', 'admin', 'employee', 'client'] },
    { key: 'users', label: 'Kullanıcılar', icon: Users, roles: ['super_admin', 'admin'] },
    { key: 'roles', label: 'Roller & Yetkiler', icon: Shield, roles: ['super_admin'] },
    { key: 'notifications', label: 'Bildirim Tercihleri', icon: Bell, roles: ['super_admin', 'admin', 'employee', 'client'] },
  ]

  const visibleTabs = tabs.filter(t => t.roles.includes(profile?.role || ''))

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-red" />
          Ayarlar
        </h1>
      </div>

      <div className="flex gap-6">
        {/* Sol menü */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  activeTab === tab.key
                    ? 'bg-brand-red/15 text-brand-red border border-brand-red/20'
                    : 'text-brand-white-muted hover:bg-brand-black-border hover:text-brand-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
                {activeTab === tab.key && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            )
          })}
        </div>

        {/* İçerik */}
        <div className="flex-1 min-w-0">

          {/* ── PROFİLİM ── */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-lg animate-fade-in">
              {/* Avatar + bilgi */}
              <div className="card flex items-center gap-4">
                <div className="w-14 h-14 bg-brand-red/10 border border-brand-red/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-black text-brand-red">{profile?.full_name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-bold text-brand-white">{profile?.full_name}</p>
                  <p className="text-sm text-brand-white-dim">{profile?.email}</p>
                  <StatusBadge status={profile?.role} type="role" />
                </div>
              </div>

              {/* Profil formu */}
              <form onSubmit={handleSaveProfile} className="card space-y-4">
                <h2 className="section-title">Kişisel Bilgiler</h2>
                {profileMsg.text && (
                  <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${profileMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {profileMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {profileMsg.text}
                  </div>
                )}
                <div>
                  <label className="label">Ad Soyad *</label>
                  <input className="input" value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">E-posta</label>
                  <input className="input opacity-50 cursor-not-allowed" value={profile?.email} disabled />
                  <p className="text-xs text-brand-white-dim mt-1">E-posta değiştirilemez.</p>
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-white-dim" />
                    <input className="input pl-9" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 555 000 00 00" />
                  </div>
                </div>
                <button type="submit" disabled={profileSaving} className="btn-primary disabled:opacity-50">
                  {profileSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
              </form>

              {/* Şifre formu */}
              <form onSubmit={handleChangePassword} className="card space-y-4">
                <h2 className="section-title flex items-center gap-2">
                  <Key className="w-4 h-4 text-brand-red" />
                  Şifre Değiştir
                </h2>
                {passwordMsg.text && (
                  <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {passwordMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {passwordMsg.text}
                  </div>
                )}
                <div>
                  <label className="label">Yeni Şifre *</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} className="input pr-10" value={passwordForm.new_password} onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))} required minLength={6} placeholder="En az 6 karakter" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-white-dim hover:text-brand-white">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Yeni Şifre (Tekrar) *</label>
                  <input type="password" className="input" value={passwordForm.confirm_password} onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))} required placeholder="Şifreyi tekrar girin" />
                </div>
                <button type="submit" disabled={passwordSaving} className="btn-primary disabled:opacity-50">
                  {passwordSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key className="w-4 h-4" />}
                  Şifreyi Güncelle
                </button>
              </form>
            </div>
          )}

          {/* ── KULLANICILAR ── */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title">Kullanıcı Yönetimi</h2>
                  <p className="text-brand-white-dim text-sm mt-1">{users.length} kullanıcı</p>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => setShowRoleModal(true)} className="btn-ghost border border-brand-black-border">
                      <RefreshCw className="w-4 h-4" /> Rol Ataması
                    </button>
                    <button onClick={() => { setShowClientModal(true); setUserError('') }} className="btn-secondary">
                      <Users className="w-4 h-4" /> Müşteri Ekle
                    </button>
                    <button onClick={() => { setShowUserModal(true); setUserError('') }} className="btn-primary">
                      <Plus className="w-4 h-4" /> Personel Ekle
                    </button>
                  </div>
                )}
              </div>

              {/* İstatistikler */}
              <div className="grid grid-cols-4 gap-3">
                {(['super_admin', 'admin', 'employee', 'client'] as const).map(role => (
                  <div key={role} className="card py-3 flex items-center justify-between">
                    <span className="text-xs text-brand-white-muted">{ROLE_LABELS[role]}</span>
                    <span className="text-lg font-black text-brand-white">{users.filter(u => u.role === role).length}</span>
                  </div>
                ))}
              </div>

              {/* Personel tablosu */}
              <div className="card overflow-hidden p-0">
                <div className="px-4 py-3 border-b border-brand-black-border">
                  <h3 className="text-sm font-bold text-brand-white">Personel ({staff.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-black-border">
                        <th className="table-header text-left px-4 py-3">Ad</th>
                        <th className="table-header text-left px-4 py-3">Rol</th>
                        <th className="table-header text-left px-4 py-3 hidden md:table-cell">Departman</th>
                        <th className="table-header text-left px-4 py-3">Durum</th>
                        {isSuperAdmin && <th className="table-header text-right px-4 py-3">İşlem</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-black-border">
                      {staff.map(u => (
                        <tr key={u.id} className="hover:bg-brand-black-border/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-brand-red/10 border border-brand-red/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-brand-red">{u.full_name?.charAt(0)?.toUpperCase()}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-brand-white">{u.full_name}</p>
                                <p className="text-xs text-brand-white-dim">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={u.role} type="role" /></td>
                          <td className="px-4 py-3 text-sm text-brand-white-muted hidden md:table-cell">{u.department || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={u.is_active ? 'badge-green' : 'badge-gray'}>{u.is_active ? 'Aktif' : 'Pasif'}</span>
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3 text-right">
                              {u.id !== profile?.id && (
                                <button onClick={() => handleToggleActive(u.id, u.is_active)} className={`text-xs px-3 py-1.5 rounded-lg transition-all ${u.is_active ? 'text-red-400 hover:bg-red-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}>
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

              {/* Müşteri tablosu */}
              <div className="card overflow-hidden p-0">
                <div className="px-4 py-3 border-b border-brand-black-border">
                  <h3 className="text-sm font-bold text-brand-white">Müşteri Hesapları ({clients.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-black-border">
                        <th className="table-header text-left px-4 py-3">Ad</th>
                        <th className="table-header text-left px-4 py-3 hidden md:table-cell">Telefon</th>
                        <th className="table-header text-left px-4 py-3">Durum</th>
                        {isSuperAdmin && <th className="table-header text-right px-4 py-3">İşlem</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-black-border">
                      {clients.map(u => (
                        <tr key={u.id} className="hover:bg-brand-black-border/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
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
                            <span className={u.is_active ? 'badge-green' : 'badge-gray'}>{u.is_active ? 'Aktif' : 'Pasif'}</span>
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => { setDeleteTarget(u); setDeleteConfirmText(''); setShowDeleteModal(true) }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-all ml-auto">
                                <Trash2 className="w-3.5 h-3.5" /> Sil
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {clients.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-white-dim text-sm">Müşteri hesabı yok</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ROLLER & YETKİLER ── */}
          {activeTab === 'roles' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title">Roller & Yetkiler</h2>
                  <p className="text-brand-white-dim text-sm mt-1">Süper Admin rolü değiştirilemez. Diğer rollerin yetkilerini düzenleyebilirsiniz.</p>
                </div>
                <button onClick={handleSaveRoles} className={`btn-primary ${rolesSaved ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                  {rolesSaved ? <><Check className="w-4 h-4" />Kaydedildi</> : <><Save className="w-4 h-4" />Kaydet</>}
                </button>
              </div>

              {/* Süper Admin — salt okunur */}
              <div className="card border-brand-red/20 bg-brand-red/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-brand-red/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-brand-red" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-brand-white">Süper Admin</h3>
                    <p className="text-xs text-brand-white-dim">Tüm yetkilere sahip — değiştirilemez</p>
                  </div>
                  <span className="ml-auto badge-red">Sabit</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.keys(PERMISSION_LABELS).map(perm => (
                    <div key={perm} className="flex items-center gap-2 text-xs text-emerald-400">
                      <Check className="w-3 h-3" />
                      {PERMISSION_LABELS[perm]}
                    </div>
                  ))}
                </div>
              </div>

              {/* Düzenlenebilir roller */}
              <div className="flex gap-2 mb-4">
                {(['admin', 'employee', 'client'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${selectedRole === role ? 'bg-brand-red text-white' : 'bg-brand-black-border text-brand-white-muted hover:text-brand-white'}`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>

              <div className="card space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-sm font-bold text-brand-white">{ROLE_LABELS[selectedRole]} Yetkileri</h3>
                </div>

                {PERMISSION_GROUPS.map(group => (
                  <div key={group.label} className="border-b border-brand-black-border pb-4 last:border-0 last:pb-0">
                    <p className="text-xs font-semibold text-brand-white-dim uppercase tracking-wider mb-3">{group.label}</p>
                    <div className="space-y-2">
                      {group.keys.map(perm => {
                        const enabled = rolePermissions[selectedRole]?.[perm] ?? false
                        return (
                          <div key={perm} className="flex items-center justify-between">
                            <span className="text-sm text-brand-white-muted">{PERMISSION_LABELS[perm]}</span>
                            <button
                              onClick={() => togglePermission(selectedRole, perm)}
                              className={`relative w-10 h-5 rounded-full transition-all duration-200 ${enabled ? 'bg-brand-red' : 'bg-brand-black-border'}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${enabled ? 'left-5' : 'left-0.5'}`} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BİLDİRİM TERCİHLERİ ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-lg animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title">Bildirim Tercihleri</h2>
                  <p className="text-brand-white-dim text-sm mt-1">Hangi durumlarda bildirim almak istediğinizi seçin.</p>
                </div>
                <button onClick={handleSaveNotif} disabled={notifSaving} className={`btn-primary disabled:opacity-50 ${notifSaved ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                  {notifSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : notifSaved ? <><Check className="w-4 h-4" />Kaydedildi</>
                    : <><Save className="w-4 h-4" />Kaydet</>}
                </button>
              </div>

              <div className="card space-y-0 divide-y divide-brand-black-border p-0 overflow-hidden">
                {[
                  { key: 'new_ticket', label: 'Yeni Destek Bileti', desc: 'Yeni bir bilet oluşturulduğunda' },
                  { key: 'ticket_reply', label: 'Bilet Yanıtı', desc: 'Biletinize yanıt geldiğinde' },
                  { key: 'ticket_resolved', label: 'Bilet Çözüldü', desc: 'Bir bilet çözüldüğünde' },
                  { key: 'new_invoice', label: 'Yeni Fatura', desc: 'Yeni fatura oluşturulduğunda' },
                  { key: 'invoice_overdue', label: 'Gecikmiş Fatura', desc: 'Fatura vadesi geçtiğinde' },
                  { key: 'new_meeting', label: 'Yeni Görüşme', desc: 'Görüşme eklendiğinde' },
                  { key: 'task_assigned', label: 'Görev Atandı', desc: 'Size görev atandığında' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between px-4 py-3.5 hover:bg-brand-black-border/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-brand-white">{item.label}</p>
                      <p className="text-xs text-brand-white-dim">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                      className={`relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${notifPrefs[item.key as keyof typeof notifPrefs] ? 'bg-brand-red' : 'bg-brand-black-border'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${notifPrefs[item.key as keyof typeof notifPrefs] ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODALLER ===== */}

      {/* Rol Ataması */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-xl max-h-[80vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="section-title flex items-center gap-2"><RefreshCw className="w-5 h-5 text-brand-red" />Rol Ataması</h2>
                <p className="text-xs text-brand-white-dim mt-1">Müşterilerin rolleri değiştirilemez. Süper Admin atanamaz.</p>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="text-brand-white-dim hover:text-brand-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {staff.filter(u => u.id !== profile?.id).map(u => (
                <div key={u.id} className="flex items-center justify-between py-3 px-4 bg-brand-black rounded-xl border border-brand-black-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-red/10 border border-brand-red/20 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-brand-red">{u.full_name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand-white">{u.full_name}</p>
                      <p className="text-xs text-brand-white-dim">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={u.role} type="role" />
                    <span className="text-brand-white-dim">→</span>
                    <select
                      className="bg-brand-black-soft border border-brand-black-border rounded-lg text-sm px-3 py-1.5 text-brand-white focus:outline-none focus:border-brand-red"
                      value={u.role}
                      onChange={e => requestRoleChange(u, e.target.value)}
                    >
                      <option value="admin">Yönetici</option>
                      <option value="employee">Çalışan</option>
                    </select>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between py-3 px-4 bg-brand-red/5 rounded-xl border border-brand-red/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-red/10 border border-brand-red/20 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-brand-red">{profile?.full_name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-white">{profile?.full_name} <span className="text-xs text-brand-red">(Siz)</span></p>
                    <p className="text-xs text-brand-white-dim">{profile?.email}</p>
                  </div>
                </div>
                <StatusBadge status={profile?.role} type="role" />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-brand-black-border flex justify-end">
              <button onClick={() => setShowRoleModal(false)} className="btn-secondary">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* Rol Değiştirme Onayı */}
      {showRoleConfirm && roleTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-brand-black-card border border-amber-500/30 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-400" /></div>
              <div>
                <h2 className="text-base font-bold text-brand-white">Rol Değiştir</h2>
                <p className="text-xs text-brand-white-dim">Bu işlemi onaylıyor musunuz?</p>
              </div>
            </div>
            <div className="bg-brand-black border border-brand-black-border rounded-xl p-4 mb-5 space-y-3">
              <p className="text-sm font-semibold text-brand-white">{roleTarget.full_name}</p>
              <div className="flex items-center gap-3">
                <StatusBadge status={roleTarget.role} type="role" />
                <span className="text-brand-white-dim">→</span>
                <StatusBadge status={pendingRole} type="role" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmRoleChange} disabled={roleLoading} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm">
                {roleLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Onayla
              </button>
              <button onClick={() => { setShowRoleConfirm(false); setRoleTarget(null); setPendingRole('') }} className="btn-secondary">İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Personel Ekle */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title flex items-center gap-2"><Plus className="w-5 h-5 text-brand-red" />Yeni Personel</h2>
              <button onClick={() => { setShowUserModal(false); setUserError('') }} className="text-brand-white-dim hover:text-brand-white"><X className="w-5 h-5" /></button>
            </div>
            {userError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">{userError}</div>}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div><label className="label">Ad Soyad *</label><input className="input" value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} required placeholder="Ahmet Yılmaz" /></div>
              <div><label className="label">E-posta *</label><input type="email" className="input" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required placeholder="ahmet@rathudan.com" /></div>
              <div><label className="label">Şifre *</label><input type="password" className="input" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} required minLength={6} placeholder="En az 6 karakter" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Rol</label>
                  <select className="select" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="admin">Yönetici</option>
                    <option value="employee">Çalışan</option>
                  </select>
                </div>
                <div><label className="label">Telefon</label><input className="input" value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 555..." /></div>
              </div>
              <div><label className="label">Departman</label><input className="input" value={userForm.department} onChange={e => setUserForm(f => ({ ...f, department: e.target.value }))} placeholder="Tasarım, Yazılım..." /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={userSubmitting} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {userSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}Oluştur
                </button>
                <button type="button" onClick={() => { setShowUserModal(false); setUserError('') }} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Müşteri Ekle */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title flex items-center gap-2"><Users className="w-5 h-5 text-brand-red" />Yeni Müşteri Hesabı</h2>
              <button onClick={() => { setShowClientModal(false); setUserError('') }} className="text-brand-white-dim hover:text-brand-white"><X className="w-5 h-5" /></button>
            </div>
            {userError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">{userError}</div>}
            <form onSubmit={handleCreateClient} className="space-y-4">
              <p className="text-xs text-brand-white-dim border-b border-brand-black-border pb-2">Giriş Bilgileri</p>
              <div><label className="label">Ad Soyad *</label><input className="input" value={clientForm.full_name} onChange={e => setClientForm(f => ({ ...f, full_name: e.target.value }))} required placeholder="Mehmet Demir" /></div>
              <div><label className="label">E-posta *</label><input type="email" className="input" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} required placeholder="info@firma.com" /></div>
              <div><label className="label">Şifre *</label><input type="password" className="input" value={clientForm.password} onChange={e => setClientForm(f => ({ ...f, password: e.target.value }))} required minLength={6} placeholder="En az 6 karakter" /></div>
              <div><label className="label">Telefon</label><input className="input" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 555..." /></div>
              <p className="text-xs text-brand-white-dim border-b border-brand-black-border pb-2 pt-2">Firma Bilgileri</p>
              <div><label className="label">Firma Adı *</label><input className="input" value={clientForm.company_name} onChange={e => setClientForm(f => ({ ...f, company_name: e.target.value }))} required placeholder="Örnek A.Ş." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Şehir</label><input className="input" value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} placeholder="Bursa" /></div>
                <div><label className="label">Vergi No</label><input className="input" value={clientForm.tax_number} onChange={e => setClientForm(f => ({ ...f, tax_number: e.target.value }))} placeholder="1234567890" /></div>
              </div>
              <div><label className="label">Notlar</label><textarea className="input resize-none" rows={2} value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={userSubmitting} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {userSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}Oluştur
                </button>
                <button type="button" onClick={() => { setShowClientModal(false); setUserError('') }} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Müşteri Sil */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
              <div>
                <h2 className="text-base font-bold text-brand-white">Müşteriyi Sil</h2>
                <p className="text-xs text-brand-white-dim">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5">
              <p className="text-sm text-brand-white-muted"><span className="font-semibold text-brand-white">{deleteTarget.full_name}</span> adlı müşterinin hesabı kalıcı olarak silinecek.</p>
            </div>
            <div className="mb-5">
              <label className="label">Onaylamak için <span className="text-brand-white font-bold">"{deleteTarget.full_name}"</span> yazın</label>
              <input className="input" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={deleteTarget.full_name} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleteConfirmText !== deleteTarget.full_name || deleteLoading} className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm">
                {deleteLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}Kalıcı Olarak Sil
              </button>
              <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); setDeleteConfirmText('') }} className="btn-secondary">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
