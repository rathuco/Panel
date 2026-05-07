'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Crown, Users, Calendar, Edit2, Save, X,
  Trash2, AlertTriangle, Plus, CheckSquare, Clock,
} from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [project, setProject] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)

  const [editForm, setEditForm] = useState<any>({})
  const [editMembers, setEditMembers] = useState<string[]>([])
  const [editLeader, setEditLeader] = useState('')

  useEffect(() => { fetchAll() }, [params.id])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: proj }, { data: mem }, { data: t }, { data: users }, { data: cl }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('projects').select('*, client:clients(company_name), manager:profiles!projects_manager_id_fkey(full_name)').eq('id', params.id).single(),
      supabase.from('project_members').select('*, user:profiles(id, full_name, role)').eq('project_id', params.id),
      supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name)').eq('project_id', params.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role').eq('is_active', true).neq('role', 'client').order('full_name'),
      supabase.from('clients').select('id, company_name').eq('is_active', true).order('company_name'),
    ])

    setProfile(prof)
    setProject(proj)
    setMembers(mem || [])
    setTasks(t || [])
    setAllUsers(users || [])
    setClients(cl || [])

    if (proj) {
      setEditForm({
        name: proj.name,
        description: proj.description || '',
        notes: proj.notes || '',
        client_id: proj.client_id || '',
        status: proj.status,
        start_date: proj.start_date || '',
        deadline: proj.deadline || '',
        budget: proj.budget || '',
      })
    }
    if (mem) {
      setEditMembers(mem.map((m: any) => m.user_id))
      setEditLeader(mem.find((m: any) => m.is_leader)?.user_id || '')
    }

    setLoading(false)
  }

  const leader = members.find(m => m.is_leader)
  const isSuperAdmin = profile?.role === 'super_admin'
  const isLeader = leader?.user_id === profile?.id
  const canEdit = isSuperAdmin || isLeader

  const handleSave = async () => {
    setSaving(true)

    await supabase.from('projects').update({
      name: editForm.name,
      description: editForm.description || null,
      notes: editForm.notes || null,
      client_id: editForm.client_id || null,
      status: editForm.status,
      start_date: editForm.start_date || null,
      deadline: editForm.deadline || null,
      budget: editForm.budget ? parseFloat(editForm.budget) : null,
    }).eq('id', params.id)

    // Üyeleri güncelle
    await supabase.from('project_members').delete().eq('project_id', params.id)
    await supabase.from('project_members').insert(
      editMembers.map(userId => ({
        project_id: params.id,
        user_id: userId,
        is_leader: userId === editLeader,
      }))
    )

    setSaving(false)
    setEditMode(false)
    fetchAll()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('tasks').delete().eq('project_id', params.id)
    await supabase.from('project_members').delete().eq('project_id', params.id)
    await supabase.from('projects').delete().eq('id', params.id)
    setDeleting(false)
    router.push('/projects')
  }

  const toggleEditMember = (userId: string) => {
    setEditMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
    if (editLeader === userId) setEditLeader('')
  }

  const roleLabel: Record<string, string> = { super_admin: 'Süper Admin', admin: 'Yönetici', employee: 'Çalışan' }

  const doneTasks = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
    </div>
  )

  if (!project) return (
    <div className="p-6 text-center">
      <p className="text-brand-white-dim">Proje bulunamadı</p>
      <Link href="/projects" className="text-brand-red text-sm hover:underline mt-2 inline-block">← Projelere Dön</Link>
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/projects" className="btn-ghost mt-1"><ArrowLeft className="w-4 h-4" />Projeler</Link>
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.client && <p className="text-brand-white-dim text-sm mt-0.5">{project.client.company_name}</p>}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
                <button onClick={() => { setEditMode(false); fetchAll() }} className="btn-secondary">
                  <X className="w-4 h-4" /> İptal
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="btn-secondary">
                  <Edit2 className="w-4 h-4" /> Düzenle
                </button>
                {isSuperAdmin && (
                  <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all">
                    <Trash2 className="w-4 h-4" /> Sil
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol — Detaylar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Proje bilgileri */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Proje Detayları</h2>
              <StatusBadge status={project.status} type="project" />
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Proje Adı *</label>
                  <input className="input" value={editForm.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Müşteri</label>
                    <select className="select" value={editForm.client_id} onChange={e => setEditForm((f: any) => ({ ...f, client_id: e.target.value }))}>
                      <option value="">İç proje</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Durum</label>
                    <select className="select" value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                      <option value="planning">Planlama</option>
                      <option value="active">Aktif</option>
                      <option value="on_hold">Beklemede</option>
                      <option value="completed">Tamamlandı</option>
                      <option value="cancelled">İptal</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Başlangıç</label>
                    <input type="date" className="input" value={editForm.start_date} onChange={e => setEditForm((f: any) => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Bitiş</label>
                    <input type="date" className="input" value={editForm.deadline} onChange={e => setEditForm((f: any) => ({ ...f, deadline: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Bütçe (₺)</label>
                    <input type="number" className="input" value={editForm.budget} onChange={e => setEditForm((f: any) => ({ ...f, budget: e.target.value }))} min="0" />
                  </div>
                </div>
                <div>
                  <label className="label">Açıklama</label>
                  <textarea className="input resize-none" rows={3} value={editForm.description} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Notlar</label>
                  <textarea className="input resize-none" rows={4} value={editForm.notes} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {project.start_date && (
                    <div>
                      <p className="text-xs text-brand-white-dim">Başlangıç</p>
                      <p className="text-brand-white">{format(new Date(project.start_date), 'd MMM yyyy', { locale: tr })}</p>
                    </div>
                  )}
                  {project.deadline && (
                    <div>
                      <p className="text-xs text-brand-white-dim">Bitiş</p>
                      <p className="text-brand-white">{format(new Date(project.deadline), 'd MMM yyyy', { locale: tr })}</p>
                    </div>
                  )}
                  {project.budget && (
                    <div>
                      <p className="text-xs text-brand-white-dim">Bütçe</p>
                      <p className="text-brand-white">₺{project.budget.toLocaleString('tr-TR')}</p>
                    </div>
                  )}
                </div>
                {project.description && (
                  <div>
                    <p className="text-xs text-brand-white-dim mb-1">Açıklama</p>
                    <p className="text-sm text-brand-white-muted">{project.description}</p>
                  </div>
                )}
                {project.notes && (
                  <div className="border-t border-brand-black-border pt-3">
                    <p className="text-xs text-brand-white-dim mb-1">Notlar</p>
                    <p className="text-sm text-brand-white-muted whitespace-pre-wrap">{project.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Görevler */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-brand-red" />
                Görevler ({tasks.length})
              </h2>
              <div className="flex items-center gap-3">
                {tasks.length > 0 && (
                  <span className="text-xs text-brand-white-dim">%{progress} tamamlandı</span>
                )}
              </div>
            </div>

            {tasks.length > 0 && (
              <div className="w-full bg-brand-black-border rounded-full h-1.5">
                <div className="bg-brand-red h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between py-2.5 px-3 bg-brand-black rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.status === 'done' ? 'bg-emerald-400' :
                      task.status === 'in_progress' ? 'bg-blue-400' :
                      task.status === 'review' ? 'bg-amber-400' : 'bg-gray-400'
                    }`} />
                    <p className={`text-sm truncate ${task.status === 'done' ? 'line-through text-brand-white-dim' : 'text-brand-white'}`}>
                      {task.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.assignee && (
                      <span className="text-xs text-brand-white-dim hidden md:block">{task.assignee.full_name}</span>
                    )}
                    <StatusBadge status={task.priority} type="priority" />
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-brand-white-dim text-sm text-center py-4">Henüz görev yok</p>
              )}
            </div>
          </div>
        </div>

        {/* Sağ — Ekip */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-red" />
                Ekip ({members.length})
              </h2>
            </div>

            {editMode ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {allUsers.map(user => {
                  const isMember = editMembers.includes(user.id)
                  const isLeaderUser = editLeader === user.id
                  return (
                    <div key={user.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${isMember ? 'bg-brand-red/5 border-brand-red/20' : 'bg-brand-black border-brand-black-border'}`}>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleEditMember(user.id)} className={`w-4 h-4 rounded border flex items-center justify-center ${isMember ? 'bg-brand-red border-brand-red' : 'border-brand-black-border'}`}>
                          {isMember && <span className="text-white text-[10px]">✓</span>}
                        </button>
                        <span className="text-sm text-brand-white">{user.full_name}</span>
                      </div>
                      {isMember && (
                        <button type="button" onClick={() => setEditLeader(isLeaderUser ? '' : user.id)} className={`text-xs px-2 py-0.5 rounded transition-all ${isLeaderUser ? 'text-amber-400 bg-amber-500/15' : 'text-brand-white-dim hover:text-brand-white'}`}>
                          <Crown className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 py-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${member.is_leader ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-brand-red/10 border border-brand-red/20'}`}>
                      <span className={`text-xs font-bold ${member.is_leader ? 'text-amber-400' : 'text-brand-red'}`}>
                        {member.user?.full_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-white truncate">{member.user?.full_name}</p>
                      <p className="text-xs text-brand-white-dim">{roleLabel[member.user?.role]}</p>
                    </div>
                    {member.is_leader && (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <Crown className="w-3 h-3" />
                        <span>Başkan</span>
                      </div>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-brand-white-dim text-sm">Ekip üyesi yok</p>
                )}
              </div>
            )}
          </div>

          {/* Proje özeti */}
          <div className="card space-y-3 text-sm">
            <h2 className="section-title">Özet</h2>
            <div className="flex justify-between">
              <span className="text-brand-white-dim">Toplam Görev</span>
              <span className="text-brand-white font-semibold">{tasks.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-white-dim">Tamamlanan</span>
              <span className="text-emerald-400 font-semibold">{doneTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-white-dim">Devam Eden</span>
              <span className="text-blue-400 font-semibold">{tasks.filter(t => t.status === 'in_progress').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-white-dim">Bekleyen</span>
              <span className="text-gray-400 font-semibold">{tasks.filter(t => t.status === 'todo').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Silme Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-white">Projeyi Sil</h2>
                <p className="text-xs text-brand-white-dim">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5">
              <p className="text-sm text-brand-white-muted">
                <span className="font-semibold text-brand-white">{project.name}</span> projesi ve tüm görevleri kalıcı olarak silinecek.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm">
                {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Evet, Sil
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
