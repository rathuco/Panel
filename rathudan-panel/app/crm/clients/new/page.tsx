'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    tax_number: '',
    notes: '',
    is_active: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const tempPassword = generatePassword()

    // API ile kullanıcı hesabı oluştur
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: tempPassword,
        full_name: form.contact_name,
        role: 'client',
        phone: form.phone || null,
        company_name: form.company_name,
        city: form.city || null,
        tax_number: form.tax_number || null,
        notes: form.notes || null,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error || 'Müşteri hesabı oluşturulamadı.')
      setLoading(false)
      return
    }

    // clients tablosuna temp_password ile güncelle
    const { error: updateError } = await supabase
      .from('clients')
      .update({ temp_password: tempPassword, password_changed: false })
      .eq('email', form.email)

    if (updateError) {
      console.error('temp_password update error:', updateError)
    }

    router.push('/crm/clients')
  }

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/crm/clients" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Link>
        <h1 className="page-title">Yeni Müşteri</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-blue-400 text-sm">
          💡 Müşteri oluşturulduğunda otomatik panel hesabı ve geçici şifre oluşturulacak.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Firma Adı *</label>
            <input className="input" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} required placeholder="Örnek A.Ş." />
          </div>
          <div>
            <label className="label">Yetkili Ad Soyad *</label>
            <input className="input" value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} required placeholder="Ahmet Yılmaz" />
          </div>
          <div>
            <label className="label">E-posta *</label>
            <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="info@ornek.com" />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+90 555 000 00 00" />
          </div>
          <div>
            <label className="label">Şehir</label>
            <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Bursa" />
          </div>
          <div>
            <label className="label">Vergi No</label>
            <input className="input" value={form.tax_number} onChange={(e) => set('tax_number', e.target.value)} placeholder="1234567890" />
          </div>
        </div>

        <div>
          <label className="label">Adres</label>
          <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Tam adres..." />
        </div>

        <div>
          <label className="label">Notlar</label>
          <textarea className="input min-h-[80px] resize-none" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Müşteri hakkında notlar..." />
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="w-4 h-4 accent-brand-red" />
          <label htmlFor="is_active" className="text-sm text-brand-white-muted">Aktif müşteri</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
          <Link href="/crm/clients" className="btn-secondary">İptal</Link>
        </div>
      </form>
    </div>
  )
}
