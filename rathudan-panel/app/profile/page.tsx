'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Save, Key, AlertCircle, CheckCircle } from 'lucide-react'

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setForm({ full_name: data?.full_name || '', phone: data?.phone || '' })
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name, phone: form.phone || null })
      .eq('id', profile.id)

    if (error) setErrorMsg(error.message)
    else { setSuccessMsg('Profil bilgileri güncellendi.'); fetchProfile() }
    setSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPwd(true)
    setSuccessMsg('')
    setErrorMsg('')

    if (passwordForm.new !== passwordForm.confirm) {
      setErrorMsg('Yeni şifreler eşleşmiyor.')
      setChangingPwd(false)
      return
    }

    if (passwordForm.new.length < 6) {
      setErrorMsg('Şifre en az 6 karakter olmalı.')
      setChangingPwd(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: passwordForm.new })

    if (error) setErrorMsg(error.message)
    else {
      setSuccessMsg('Şifreniz başarıyla değiştirildi.')
      setPasswordForm({ current: '', new: '', confirm: '' })
    }
    setChangingPwd(false)
  }

  if (!profile) return <div className="p-6 text-brand-white-dim">Yükleniyor...</div>

  const roleLabel: Record<string, string> = {
    super_admin: 'Süper Admin', admin: 'Yönetici', employee: 'Çalışan', client: 'Müşteri'
  }

  return (
    <div className="p-6 max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <User className="w-6 h-6 text-brand-red" />
          Profilim
        </h1>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Profil bilgileri */}
      <form onSubmit={handleSaveProfile} className="card space-y-5">
        <div className="flex items-center gap-4 pb-4 border-b border-brand-black-border">
          <div className="w-14 h-14 bg-brand-red/10 border border-brand-red/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black text-brand-red">
              {profile.full_name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-brand-white">{profile.full_name}</p>
            <p className="text-sm text-brand-white-dim">{profile.email}</p>
            <span className="badge-gray mt-1 inline-block">{roleLabel[profile.role]}</span>
          </div>
        </div>

        <div>
          <label className="label">Ad Soyad *</label>
          <input
            className="input"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label">Telefon</label>
          <input
            className="input"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+90 555 000 00 00"
          />
        </div>

        <div>
          <label className="label">E-posta</label>
          <input className="input opacity-50 cursor-not-allowed" value={profile.email} disabled />
          <p className="text-xs text-brand-white-dim mt-1">E-posta değiştirilemez.</p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Bilgileri Kaydet
        </button>
      </form>

      {/* Şifre değiştir */}
      <form onSubmit={handleChangePassword} className="card space-y-5">
        <h2 className="section-title flex items-center gap-2">
          <Key className="w-4 h-4 text-brand-red" />
          Şifre Değiştir
        </h2>

        <div>
          <label className="label">Yeni Şifre *</label>
          <input
            type="password"
            className="input"
            value={passwordForm.new}
            onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))}
            required
            minLength={6}
            placeholder="En az 6 karakter"
          />
        </div>

        <div>
          <label className="label">Yeni Şifre (Tekrar) *</label>
          <input
            type="password"
            className="input"
            value={passwordForm.confirm}
            onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
            required
            placeholder="Şifreyi tekrar girin"
          />
        </div>

        <button type="submit" disabled={changingPwd} className="btn-primary disabled:opacity-50">
          {changingPwd ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key className="w-4 h-4" />}
          Şifreyi Güncelle
        </button>
      </form>
    </div>
  )
}
