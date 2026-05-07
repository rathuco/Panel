'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckSquare, Plus, X, Save, AlertTriangle, Trash2,
  Edit2, MessageSquare, Clock, User, Flag,
} from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format, isAfter, addDays } from 'date-fns'
import { tr } from 'date-fns/locale'

type Filter = 'all' | 'todo' | 'in_progress' | 'done' | 'mine'

export default function TasksPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [editingTask, setEditingTask] = useState(false)

  const [taskForm, setTaskForm] = useState({
    title: '', description: '', assigned_to: '',
    priority: 'medium', status: 'todo', due_date: '',
  })

  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    // Görevleri getir — sadece proje görevleri değil, genel görevler
    const { data: t } = await supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), creator:profiles!tasks_created_by_fkey(id, full_name), project:projects(id, name)')
      .is('project_id', null) // Sadece proje bağlantısı olmayan görevler
      .order('created_at', { ascending: false })

    setTasks(t || [])

    // Atanabilir kullanıcıları role göre filtrele
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('is_active', true)
      .neq('role', 'client')
      .order('full_name')

    setAllUsers(users || [])
    setLoading(false)
  }

  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdmin = profile?.role === 'admin'
  const isEmployee = profile?.role === 'employee'

  // Atanabilir kullanıcıları role göre filtrele
  const assignableUsers = allUsers.filter(u => {
    if (isSuperAdmin) return true // herkese atayabilir
    if (isAdmin) return u.role === 'employee' // sadece çalışanlara
    if (isEmployee) return u.role === 'employee' // sadece çalışanlara
    return false
  })

  // Filtreleme
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return task.assigned_to === profile?.id || task.created_by === profile?.id || isSuperAdmin
    if (filter === 'todo') return task.status === 'todo' && (task.assigned_to === profile?.id || task.created_by === profile?.id || isSuperAdmin)
    if (filter === 'in_progress') return task.status === 'in_progress' && (task.assigned_to === profile?.id || task.created_by === profile?.id || isSuperAdmin)
    if (filter === 'done') return task.status === 'done' && (task.assigned_to === profile?.id || task.created_by === profile?.id || isSuperAdmin)
    if (filter === 'mine') return task.created_by === profile?.id
    return true
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('tasks').insert([{
      title: taskForm.title,
      description: taskForm.description || null,
      assigned_to: taskForm.assigned_to || null,
      priority: taskForm.priority,
      status: taskForm.status,
      due_date: taskForm.due_date || null,
      created_by: user!.id,
      project_id: null,
    }])

    setCreateLoading(false)
    setShowCreateModal(false)
    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', status: 'todo', due_date: '' })
    fetchAll()
  }

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    }).eq('id', taskId)
    fetchAll()
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev: any) => ({ ...prev, status: newStatus }))
    }
  }

  const handleSaveEdit = async () => {
    await supabase.from('tasks').update({
      title: editForm.title,
      description: editForm.description || null,
      priority: editForm.priority,
      status: editForm.status,
      due_date: editForm.due_date || null,
      assigned_to: editForm.assigned_to || null,
    }).eq('id', selectedTask.id)
    setEditingTask(false)
    fetchAll()
    setShowDetailModal(false)
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    await supabase.from('task_suggestions').delete().eq('task_id', selectedTask.id)
    await supabase.from('tasks').delete().eq('id', selectedTask.id)
    setDeleteLoading(false)
    setShowDeleteConfirm(false)
    setShowDetailModal(false)
    setSelectedTask(null)
    fetchAll()
  }

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim() || !selectedTask) return
    setSuggestionLoading(true)

    await supabase.from('task_suggestions').insert([{
      task_id: selectedTask.id,
      from_user_id: profile.id,
      to_user_id: selectedTask.created_by,
      message: suggestionText,
    }])

    setSuggestionLoading(false)
    setSuggestionText('')
    setShowSuggestModal(false)
  }

  const openDetail = (task: any) => {
    setSelectedTask(task)
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || '',
    })
    setEditingTask(false)
    setShowDetailModal(true)
  }

  const canEditTask = (task: any) => {
    if (isSuperAdmin) return true
    return task.created_by === profile?.id
  }

  const canDeleteTask = (task: any) => {
    if (isSuperAdmin) return true
    return task.created_by === profile?.id
  }

  const isAssignedToMe = (task: any) => task.assigned_to === profile?.id
  const isDeadlineNear = (task: any) => {
    if (!task.due_date || task.status === 'done') return false
    const deadline = new Date(task.due_date)
    const threeDaysFromNow = addDays(new Date(), 3)
    return !isAfter(deadline, threeDaysFromNow)
  }

  const priorityColors: Record<string, string> = {
    urgent: 'border-red-500/40 bg-red-500/5',
    high: 'border-amber-500/40 bg-amber-500/5',
    medium: 'border-blue-500/40 bg-blue-500/5',
    low: 'border-gray-500/40 bg-gray-500/5',
  }

  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: 'Tümü', count: tasks.filter(t => t.assigned_to === profile?.id || t.created_by === profile?.id || isSuperAdmin).length },
    { key: 'todo', label: 'Yapılacak', count: tasks.filter(t => t.status === 'todo' && (t.assigned_to === profile?.id || t.created_by === profile?.id || isSuperAdmin)).length },
    { key: 'in_progress', label: 'İşlemde', count: tasks.filter(t => t.status === 'in_progress' && (t.assigned_to === profile?.id || t.created_by === profile?.id || isSuperAdmin)).length },
    { key: 'done', label: 'Tamamlandı', count: tasks.filter(t => t.status === 'done' && (t.assigned_to === profile?.id || t.created_by === profile?.id || isSuperAdmin)).length },
    { key: 'mine', label: 'Oluşturduklarım', count: tasks.filter(t => t.created_by === profile?.id).length },
  ]

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-brand-red" />
            Görevler
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">Genel görevler — proje görevleri için projeye gidin</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Görev Oluştur
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.key ? 'bg-brand-red text-white' : 'bg-brand-black-border text-brand-white-muted hover:text-brand-white'
            }`}
          >
            {f.label}
            {f.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f.key ? 'bg-white/20' : 'bg-brand-black text-brand-white-dim'}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Görev kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTasks.map(task => (
          <div
            key={task.id}
            onClick={() => openDetail(task)}
            className={`card-hover cursor-pointer relative border ${priorityColors[task.priority] || 'border-brand-black-border'}`}
          >
            {/* Son tarih uyarısı */}
            {isDeadlineNear(task) && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-red rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xs font-black">!</span>
              </div>
            )}

            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className={`text-sm font-bold leading-snug flex-1 ${task.status === 'done' ? 'line-through text-brand-white-dim' : 'text-brand-white'}`}>
                {task.title}
              </h3>
              <StatusBadge status={task.status} type="task" />
            </div>

            <div className="space-y-1.5 text-xs text-brand-white-dim">
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3" />
                <span>Oluşturan: {task.creator?.full_name || '—'}</span>
              </div>
              {task.assignee && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-brand-red" />
                  <span className="text-brand-red">Atanan: {task.assignee.full_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>{format(new Date(task.created_at), 'd MMM yyyy', { locale: tr })}</span>
                {task.due_date && (
                  <span className={`ml-1 ${isDeadlineNear(task) ? 'text-red-400 font-semibold' : ''}`}>
                    · Son: {format(new Date(task.due_date), 'd MMM', { locale: tr })}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-brand-black-border">
              <StatusBadge status={task.priority} type="priority" />
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="col-span-3 card text-center py-16">
            <CheckSquare className="w-10 h-10 text-brand-black-border mx-auto mb-3" />
            <p className="text-brand-white-dim">Bu filtrede görev bulunamadı</p>
          </div>
        )}
      </div>

      {/* ===== GÖREV OLUŞTUR MODAL ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Yeni Görev</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-brand-white-dim hover:text-brand-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Başlık *</label>
                <input className="input" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required placeholder="Görev başlığı..." />
              </div>
              <div>
                <label className="label">Açıklama</label>
                <textarea className="input resize-none" rows={2} value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Görev detayları..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Öncelik</label>
                  <select className="select" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>
                <div>
                  <label className="label">Son Tarih</label>
                  <input type="date" className="input" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Atanan Kişi</label>
                <select className="select" value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}>
                  <option value="">Atanmadı</option>
                  {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
                {!isSuperAdmin && (
                  <p className="text-xs text-brand-white-dim mt-1">
                    {isAdmin ? 'Yalnızca çalışanlara atayabilirsiniz.' : 'Yalnızca çalışanlara atayabilirsiniz.'}
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createLoading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {createLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Oluştur
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== GÖREV DETAY MODAL ===== */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 min-w-0">
                {editingTask ? (
                  <input className="input text-base font-bold" value={editForm.title} onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))} />
                ) : (
                  <h2 className="text-base font-bold text-brand-white">{selectedTask.title}</h2>
                )}
              </div>
              <button onClick={() => { setShowDetailModal(false); setEditingTask(false) }} className="text-brand-white-dim hover:text-brand-white ml-3 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Durum değiştir */}
              {(canEditTask(selectedTask) || isAssignedToMe(selectedTask)) && !editingTask && (
                <div>
                  <p className="label">Durum</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['todo', 'in_progress', 'review', 'done'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => handleUpdateStatus(selectedTask.id, s)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          selectedTask.status === s
                            ? 'bg-brand-red border-brand-red text-white'
                            : 'border-brand-black-border text-brand-white-muted hover:border-brand-red/40'
                        }`}
                      >
                        {{ todo: 'Yapılacak', in_progress: 'İşlemde', review: 'İncelemede', done: 'Tamamlandı' }[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Detaylar */}
              {editingTask ? (
                <div className="space-y-3">
                  <div>
                    <label className="label">Açıklama</label>
                    <textarea className="input resize-none" rows={3} value={editForm.description} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Öncelik</label>
                      <select className="select" value={editForm.priority} onChange={e => setEditForm((f: any) => ({ ...f, priority: e.target.value }))}>
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                        <option value="urgent">Acil</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Son Tarih</label>
                      <input type="date" className="input" value={editForm.due_date} onChange={e => setEditForm((f: any) => ({ ...f, due_date: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Atanan Kişi</label>
                    <select className="select" value={editForm.assigned_to} onChange={e => setEditForm((f: any) => ({ ...f, assigned_to: e.target.value }))}>
                      <option value="">Atanmadı</option>
                      {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-brand-white-dim">Öncelik</p>
                      <StatusBadge status={selectedTask.priority} type="priority" />
                    </div>
                    <div>
                      <p className="text-xs text-brand-white-dim">Durum</p>
                      <StatusBadge status={selectedTask.status} type="task" />
                    </div>
                    <div>
                      <p className="text-xs text-brand-white-dim">Oluşturan</p>
                      <p className="text-brand-white">{selectedTask.creator?.full_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-brand-white-dim">Atanan</p>
                      <p className="text-brand-white">{selectedTask.assignee?.full_name || '—'}</p>
                    </div>
                    {selectedTask.due_date && (
                      <div>
                        <p className="text-xs text-brand-white-dim">Son Tarih</p>
                        <p className={isDeadlineNear(selectedTask) ? 'text-red-400 font-semibold' : 'text-brand-white'}>
                          {format(new Date(selectedTask.due_date), 'd MMMM yyyy', { locale: tr })}
                          {isDeadlineNear(selectedTask) && ' ⚠️'}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedTask.description && (
                    <div>
                      <p className="text-xs text-brand-white-dim mb-1">Açıklama</p>
                      <p className="text-brand-white-muted whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-2 pt-2 border-t border-brand-black-border flex-wrap">
                {editingTask ? (
                  <>
                    <button onClick={handleSaveEdit} className="btn-primary flex-1 justify-center">
                      <Save className="w-4 h-4" /> Kaydet
                    </button>
                    <button onClick={() => setEditingTask(false)} className="btn-secondary">İptal</button>
                  </>
                ) : (
                  <>
                    {canEditTask(selectedTask) && (
                      <button onClick={() => setEditingTask(true)} className="btn-secondary">
                        <Edit2 className="w-4 h-4" /> Düzenle
                      </button>
                    )}
                    {isAssignedToMe(selectedTask) && !canEditTask(selectedTask) && (
                      <button
                        onClick={() => { setShowDetailModal(false); setShowSuggestModal(true) }}
                        className="btn-secondary"
                      >
                        <MessageSquare className="w-4 h-4" /> Düzenleme Öner
                      </button>
                    )}
                    {canDeleteTask(selectedTask) && (
                      <button
                        onClick={() => { setShowDetailModal(false); setShowDeleteConfirm(true) }}
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all ml-auto"
                      >
                        <Trash2 className="w-4 h-4" /> Sil
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DÜZENLEME ÖNERİ MODAL ===== */}
      {showSuggestModal && selectedTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="section-title flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-brand-red" />
                  Düzenleme Öner
                </h2>
                <p className="text-xs text-brand-white-dim mt-1">
                  "{selectedTask.title}" görevi için öneri görev oluşturana iletilecek.
                </p>
              </div>
              <button onClick={() => setShowSuggestModal(false)} className="text-brand-white-dim hover:text-brand-white ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Öneriniz *</label>
                <textarea
                  className="input resize-none min-h-[100px]"
                  value={suggestionText}
                  onChange={e => setSuggestionText(e.target.value)}
                  placeholder="Görev hakkında önerinizi yazın..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSendSuggestion}
                  disabled={!suggestionText.trim() || suggestionLoading}
                  className="btn-primary flex-1 justify-center disabled:opacity-50"
                >
                  {suggestionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  Öneriyi Gönder
                </button>
                <button onClick={() => setShowSuggestModal(false)} className="btn-secondary">İptal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SİLME ONAY MODAL ===== */}
      {showDeleteConfirm && selectedTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-white">Görevi Sil</h2>
                <p className="text-xs text-brand-white-dim">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5">
              <p className="text-sm text-brand-white-muted">
                <span className="font-semibold text-brand-white">"{selectedTask.title}"</span> görevi kalıcı olarak silinecek.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                {deleteLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Evet, Sil
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); setShowDetailModal(true) }} className="btn-secondary">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
