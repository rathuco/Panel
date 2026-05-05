'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HandshakeIcon, Plus, X, Save, Monitor, Users, Phone } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

const MEETING_TYPE_ICONS: Record<string, any> = {
  face_to_face: Users,
  online: Monitor,
  phone: Phone,
}

export default function MeetingsPage() {
  const supabase = createClient()
  const [meetings, setMeetings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    client_id: '', employee_id: '', title: '',
    meeting_type: 'face_to_face',
    date: new Date().toISOString().slice(0, 16),
    duration_minutes: 60,
    location: '', agenda: '', summary: '',
    outcome: '', next_steps: '', follow_up_date: '',
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: prof }, { data: m }, { data: cl }, { data: emp }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
      supabase.from('meetings').select('*, client:clients(company_name), employee:profiles(full_name)').order('date', { ascending: false }),
      supabase.from('clients').select('id, company_name').eq('is_active', true).order('company_name'),
      supabase.from('profiles').select('id, full_name').eq('is_active', true).in('role', ['super_admin', 'admin', 'employee']),
    ])
    setProfile(prof)
    setMeetings(m || [])
    setClients(cl || [])
    setEmployees(emp || [])
    setForm(f => ({ ...f, employee_id: prof?.id || '' }))
  }

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('meetings').insert([{
      ...form,
      outcome: form.outcome || null,
      follow_up_date: form.follow_up_date || null,
    }])
    setLoading(false)
    setShowModal(false)
    resetForm()
    fetchAll()
  }

  const resetForm = () => setForm({
    client_id: '', employee_id: profile?.id || '', title: '',
    meeting_type: 'face_to_face',
    date: new Date().toISOString().slice(0, 16),
    duration_minutes: 60,
    location: '', agenda: '', summary: '',
    outcome: '', next_steps: '', follow_up_date: '',
  })

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const outcomeLabels: Record<string, string> = {
    successful: 'Başarılı', follow_up_needed: 'Takip Gerekli', no_decision: 'Karar Yok', cancelled: 'İptal'
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HandshakeIcon className="w-6 h-6 text-brand-red" />
            Görüşme Raporları
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">{meetings.length} görüşme kayıtlı</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Görüşme Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['face_to_face', 'online', 'phone'].map(type => {
          const count = meetings.filter(m => m.meeting_type === type).length
          const Icon = MEETING_TYPE_ICONS[type]
          const labels: Record<string, string> = { face_to_face: 'Yüz Yüze', online: 'Online', phone: 'Telefon' }
          return (
            <div key={type} className="card py-3 flex items-center gap-3">
              <Icon className="w-5 h-5 text-brand-red" />
              <div>
                <p className="text-lg font-black text-brand-white">{count}</p>
                <p className="text-xs text-brand-white-dim">{labels[type]}</p>
              </div>
            </div>
          )
        })}
        <div className="card py-3 flex items-center gap-3">
          <HandshakeIcon className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-lg font-black text-brand-white">
              {meetings.filter(m => m.outcome === 'successful').length}
            </p>
            <p className="text-xs text-brand-white-dim">Başarılı</p>
          </div>
        </div>
      </div>

      {/* Meeting cards */}
      <div className="space-y-3">
        {meetings.length > 0 ? meetings.map(meeting => {
          const Icon = MEETING_TYPE_ICONS[meeting.meeting_type]
          return (
            <div
              key={meeting.id}
              className="card-hover cursor-pointer"
              onClick={() => setSelectedMeeting(selectedMeeting?.id === meeting.id ? null : meeting)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-brand-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-brand-white">{meeting.title}</h3>
                      {meeting.outcome && <StatusBadge status={meeting.outcome} type="meeting" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-brand-white-dim">{meeting.client?.company_name}</span>
                      <span className="text-xs text-brand-white-dim">·</span>
                      <span className="text-xs text-brand-white-dim">{meeting.employee?.full_name}</span>
                      <span className="text-xs text-brand-white-dim">·</span>
                      <span className="text-xs text-brand-white-dim">{meeting.duration_minutes} dk</span>
                    </div>
                    <p className="text-xs text-brand-white-dim mt-0.5">
                      {format(new Date(meeting.date), 'd MMMM yyyy, HH:mm', { locale: tr })}
                      {meeting.location && ` · ${meeting.location}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={meeting.meeting_type} type="meeting" />
              </div>

              {/* Expanded details */}
              {selectedMeeting?.id === meeting.id && (
                <div className="mt-4 pt-4 border-t border-brand-black-border space-y-3 animate-fade-in">
                  {meeting.agenda && (
                    <div>
                      <p className="text-xs font-semibold text-brand-white-dim uppercase tracking-wider mb-1">Gündem</p>
                      <p className="text-sm text-brand-white-muted whitespace-pre-wrap">{meeting.agenda}</p>
                    </div>
                  )}
                  {meeting.summary && (
                    <div>
                      <p className="text-xs font-semibold text-brand-white-dim uppercase tracking-wider mb-1">Özet / Notlar</p>
                      <p className="text-sm text-brand-white-muted whitespace-pre-wrap">{meeting.summary}</p>
                    </div>
                  )}
                  {meeting.next_steps && (
                    <div>
                      <p className="text-xs font-semibold text-brand-white-dim uppercase tracking-wider mb-1">Sonraki Adımlar</p>
                      <p className="text-sm text-brand-white-muted whitespace-pre-wrap">{meeting.next_steps}</p>
                    </div>
                  )}
                  {meeting.follow_up_date && (
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-amber-400">📅 Takip: {format(new Date(meeting.follow_up_date), 'd MMMM yyyy', { locale: tr })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        }) : (
          <div className="card text-center py-16">
            <HandshakeIcon className="w-10 h-10 text-brand-black-border mx-auto mb-3" />
            <p className="text-brand-white-dim">Henüz görüşme kaydı yok</p>
            <button onClick={() => setShowModal(true)} className="text-brand-red text-sm hover:underline mt-2">
              İlk görüşmeyi ekle →
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Görüşme Raporu</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-brand-white-dim hover:text-brand-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Görüşme Başlığı *</label>
                <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Örn: İlk tanışma toplantısı" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Müşteri *</label>
                  <select className="select" value={form.client_id} onChange={e => set('client_id', e.target.value)} required>
                    <option value="">Seçin...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Çalışan *</label>
                  <select className="select" value={form.employee_id} onChange={e => set('employee_id', e.target.value)} required>
                    <option value="">Seçin...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
              </div>

              {/* Meeting type */}
              <div>
                <label className="label">Görüşme Türü</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'face_to_face', label: 'Yüz Yüze', Icon: Users },
                    { key: 'online', label: 'Online', Icon: Monitor },
                    { key: 'phone', label: 'Telefon', Icon: Phone },
                  ].map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set('meeting_type', key)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${form.meeting_type === key ? 'bg-brand-red text-white' : 'bg-brand-black border border-brand-black-border text-brand-white-muted hover:border-brand-red/40'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tarih & Saat *</label>
                  <input type="datetime-local" className="input" value={form.date} onChange={e => set('date', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Süre (dk)</label>
                  <input type="number" className="input" value={form.duration_minutes} onChange={e => set('duration_minutes', parseInt(e.target.value))} min="5" step="5" />
                </div>
              </div>

              {form.meeting_type !== 'phone' && (
                <div>
                  <label className="label">Konum / Platform</label>
                  <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder={form.meeting_type === 'online' ? 'Zoom, Google Meet, Teams...' : 'Ofis, kafe...'} />
                </div>
              )}

              <div>
                <label className="label">Gündem</label>
                <textarea className="input resize-none" rows={2} value={form.agenda} onChange={e => set('agenda', e.target.value)} placeholder="Görüşmenin gündem maddeleri..." />
              </div>

              <div>
                <label className="label">Görüşme Özeti / Notlar</label>
                <textarea className="input resize-none" rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Görüşmede konuşulanlar, kararlar, notlar..." />
              </div>

              <div>
                <label className="label">Sonuç</label>
                <select className="select" value={form.outcome} onChange={e => set('outcome', e.target.value)}>
                  <option value="">Belirtilmedi</option>
                  <option value="successful">Başarılı</option>
                  <option value="follow_up_needed">Takip Gerekli</option>
                  <option value="no_decision">Karar Alınamadı</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>

              <div>
                <label className="label">Sonraki Adımlar</label>
                <textarea className="input resize-none" rows={2} value={form.next_steps} onChange={e => set('next_steps', e.target.value)} placeholder="Yapılacaklar, sorumlular..." />
              </div>

              {(form.outcome === 'follow_up_needed' || form.next_steps) && (
                <div>
                  <label className="label">Takip Tarihi</label>
                  <input type="date" className="input" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Raporu Kaydet
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
