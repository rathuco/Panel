'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Plus, X, Save, Trash2, Check } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function PackagesPage() {
  const supabase = createClient()
  const [packages, setPackages] = useState<any[]>([])
  const [clientPackages, setClientPackages] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [showPkgModal, setShowPkgModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pkgForm, setPkgForm] = useState({
    name: '', description: '', price: '', billing_period: 'monthly', features: [''], is_active: true,
  })
  const [assignForm, setAssignForm] = useState({
    client_id: '', package_id: '', start_date: new Date().toISOString().split('T')[0], end_date: '', custom_price: '', notes: '',
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: prof }, { data: pkgs }, { data: cpkgs }, { data: cl }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user!.id).single(),
      supabase.from('packages').select('*').order('price'),
      supabase.from('client_packages').select('*, client:clients(company_name), package:packages(name, price)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, company_name').eq('is_active', true).order('company_name'),
    ])
    setProfile(prof)
    setPackages(pkgs || [])
    setClientPackages(cpkgs || [])
    setClients(cl || [])
  }

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('packages').insert([{
      ...pkgForm,
      price: parseFloat(pkgForm.price),
      features: pkgForm.features.filter(f => f.trim()),
    }])
    setLoading(false)
    setShowPkgModal(false)
    setPkgForm({ name: '', description: '', price: '', billing_period: 'monthly', features: [''], is_active: true })
    fetchAll()
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('client_packages').insert([{
      ...assignForm,
      custom_price: assignForm.custom_price ? parseFloat(assignForm.custom_price) : null,
      end_date: assignForm.end_date || null,
    }])
    setLoading(false)
    setShowAssignModal(false)
    setAssignForm({ client_id: '', package_id: '', start_date: new Date().toISOString().split('T')[0], end_date: '', custom_price: '', notes: '' })
    fetchAll()
  }

  const updateFeature = (i: number, val: string) => {
    setPkgForm(f => { const features = [...f.features]; features[i] = val; return { ...f, features } })
  }

  const billingLabel: Record<string, string> = {
    monthly: 'Aylık', quarterly: '3 Aylık', yearly: 'Yıllık', one_time: 'Tek Seferlik'
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-red" />
            Paket & Hizmet Yönetimi
          </h1>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowAssignModal(true)} className="btn-secondary">
              <Plus className="w-4 h-4" /> Müşteriye Ata
            </button>
            <button onClick={() => setShowPkgModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Yeni Paket
            </button>
          </div>
        )}
      </div>

      {/* Packages grid */}
      <div>
        <h2 className="section-title mb-4">Paket Tanımları</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg: any) => (
            <div key={pkg.id} className="card-hover relative">
              {!pkg.is_active && <span className="absolute top-3 right-3 badge-gray">Pasif</span>}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-brand-white">{pkg.name}</h3>
                {pkg.description && <p className="text-sm text-brand-white-dim mt-1">{pkg.description}</p>}
              </div>
              <div className="mb-4">
                <span className="text-2xl font-black text-brand-red">₺{pkg.price.toLocaleString('tr-TR')}</span>
                <span className="text-sm text-brand-white-dim ml-1">/ {billingLabel[pkg.billing_period]}</span>
              </div>
              {pkg.features && pkg.features.length > 0 && (
                <ul className="space-y-1.5">
                  {pkg.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-brand-white-muted">
                      <Check className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {packages.length === 0 && (
            <div className="col-span-3 card text-center py-12 text-brand-white-dim">
              <Package className="w-8 h-8 mx-auto mb-3 text-brand-black-border" />
              Henüz paket tanımlanmadı
            </div>
          )}
        </div>
      </div>

      {/* Client packages */}
      <div>
        <h2 className="section-title mb-4">Müşteri Paket Atamaları</h2>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-black-border">
                  <th className="table-header text-left px-4 py-3">Müşteri</th>
                  <th className="table-header text-left px-4 py-3">Paket</th>
                  <th className="table-header text-left px-4 py-3">Durum</th>
                  <th className="table-header text-left px-4 py-3 hidden md:table-cell">Başlangıç</th>
                  <th className="table-header text-left px-4 py-3 hidden md:table-cell">Bitiş</th>
                  <th className="table-header text-right px-4 py-3 hidden lg:table-cell">Fiyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-black-border">
                {clientPackages.length > 0 ? clientPackages.map((cp: any) => (
                  <tr key={cp.id} className="hover:bg-brand-black-border/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-brand-white">{cp.client?.company_name}</td>
                    <td className="px-4 py-3 text-sm text-brand-white-muted">{cp.package?.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={cp.status} type="package" /></td>
                    <td className="px-4 py-3 text-xs text-brand-white-dim hidden md:table-cell">
                      {format(new Date(cp.start_date), 'd MMM yyyy', { locale: tr })}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-white-dim hidden md:table-cell">
                      {cp.end_date ? format(new Date(cp.end_date), 'd MMM yyyy', { locale: tr }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-brand-white hidden lg:table-cell">
                      ₺{(cp.custom_price ?? cp.package?.price ?? 0).toLocaleString('tr-TR')}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-brand-white-dim">Henüz atama yok</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Package Modal */}
      {showPkgModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Yeni Paket</h2>
              <button onClick={() => setShowPkgModal(false)} className="text-brand-white-dim hover:text-brand-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreatePackage} className="space-y-4">
              <div>
                <label className="label">Paket Adı *</label>
                <input className="input" value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} required placeholder="Starter, Growth..." />
              </div>
              <div>
                <label className="label">Açıklama</label>
                <textarea className="input resize-none" rows={2} value={pkgForm.description} onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Fiyat (₺) *</label>
                  <input type="number" className="input" value={pkgForm.price} onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))} required min="0" />
                </div>
                <div>
                  <label className="label">Dönem</label>
                  <select className="select" value={pkgForm.billing_period} onChange={e => setPkgForm(f => ({ ...f, billing_period: e.target.value }))}>
                    <option value="monthly">Aylık</option>
                    <option value="quarterly">3 Aylık</option>
                    <option value="yearly">Yıllık</option>
                    <option value="one_time">Tek Seferlik</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Özellikler</label>
                  <button type="button" onClick={() => setPkgForm(f => ({ ...f, features: [...f.features, ''] }))} className="text-xs text-brand-red hover:underline">+ Ekle</button>
                </div>
                <div className="space-y-2">
                  {pkgForm.features.map((feat, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input flex-1" value={feat} onChange={e => updateFeature(i, e.target.value)} placeholder="Özellik..." />
                      {pkgForm.features.length > 1 && (
                        <button type="button" onClick={() => setPkgForm(f => ({ ...f, features: f.features.filter((_, fi) => fi !== i) }))} className="text-brand-white-dim hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
                <button type="button" onClick={() => setShowPkgModal(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Müşteriye Paket Ata</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-brand-white-dim hover:text-brand-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="label">Müşteri *</label>
                <select className="select" value={assignForm.client_id} onChange={e => setAssignForm(f => ({ ...f, client_id: e.target.value }))} required>
                  <option value="">Seçin...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Paket *</label>
                <select className="select" value={assignForm.package_id} onChange={e => setAssignForm(f => ({ ...f, package_id: e.target.value }))} required>
                  <option value="">Seçin...</option>
                  {packages.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} — ₺{p.price.toLocaleString('tr-TR')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Başlangıç</label>
                  <input type="date" className="input" value={assignForm.start_date} onChange={e => setAssignForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <input type="date" className="input" value={assignForm.end_date} onChange={e => setAssignForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Özel Fiyat (₺)</label>
                <input type="number" className="input" value={assignForm.custom_price} onChange={e => setAssignForm(f => ({ ...f, custom_price: e.target.value }))} placeholder="Boş bırakın = Standart fiyat" min="0" />
              </div>
              <div>
                <label className="label">Notlar</label>
                <textarea className="input resize-none" rows={2} value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Ata
                </button>
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
