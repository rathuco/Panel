'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FolderKanban, Plus, X, Save, ChevronRight } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

const KANBAN_COLUMNS = [
  { key: 'todo', label: 'Yapılacak', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  { key: 'in_progress', label: 'İşlemde', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { key: 'review', label: 'İncelemede', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { key: 'done', label: 'Tamamlandı', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
]

export default function ProjectsPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskStatus, setTaskStatus] = useState('todo')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'list' | 'kanban'>('kanban')

  const [projectForm, setProjectForm] = useState({
    name: '', description: '', client_id: '', status: 'planning',
    start_date: '', deadline: '', budget: '',
  })
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', project_id: '', assigned_to: '',
    priority: 'medium', status: 'todo', due_date: '',
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: prof }, { data: proj }, { data: t }, { data: cl }, { data: emp }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
      supabase.from('projects').select('*, client:clients(company_name), manager:profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, assignee:profiles(full_name), project:projects(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, company_name').eq('is_active', true).order('company_name'),
      supabase.from('profiles').select('id, full_name').eq('is_active', true),
    ])
    setProfile(prof)
    setProjects(proj || [])
    setTasks(t || [])
    setClients(cl || [])
    setEmployees(emp || [])
    if (!selectedProject && proj && proj.length > 0) setSelectedProject(proj[0].id)
  }

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')

  const filteredTasks = selectedProject ? tasks.filter(t => t.project_id === selectedProject) : tasks

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('projects').insert([{
      ...projectForm,
      manager_id: user!.id,
      client_id: projectForm.client_id || null,
      budget: projectForm.budget ? parseFloat(projectForm.budget) : null,
      start_date: projectForm.start_date || null,
      deadline: projectForm.deadline || null,
    }])
    setLoading(false)
    setShowProjectModal(false)
    setProjectForm({ name: '', description: '', client_id: '', status: 'planning', start_date: '', deadline: '', budget: '' })
    fetchAll()
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert([{
      ...taskForm,
      created_by: user!.id,
      project_id: taskForm.project_id || selectedProject || null,
      assigned_to: taskForm.assigned_to || null,
      due_date: taskForm.due_date || null,
    }])
    setLoading(false)
    setShowTaskModal(false)
    setTaskForm({ title: '', description: '', project_id: '', assigned_to: '', priority: 'medium', status: 'todo', due_date: '' })
    fetchAll()
  }

  const moveTask = async (taskId: string, newStatus: string) => {
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    }).eq('id', taskId)
    fetchAll()
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title flex items-center gap-2">
          <FolderKanban className="w-6 h-6 text-brand-red" />
          Projeler & Görevler
        </h1>
        <div className="flex gap-2">
          <div className="flex bg-brand-black-border rounded-lg p-0.5">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${view === 'kanban' ? 'bg-brand-red text-white' : 'text-brand-white-muted hover:text-brand-white'}`}>Kanban</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${view === 'list' ? 'bg-brand-red text-white' : 'text-brand-white-muted hover:text-brand-white'}`}>Liste</button>
          </div>
          {isAdmin && (
            <>
              <button onClick={() => { setShowTaskModal(true); setTaskStatus('todo') }} className="btn-secondary">
                <Plus className="w-4 h-4" /> Görev
              </button>
              <button onClick={() => setShowProjectModal(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Proje
              </button>
            </>
          )}
        </div>
      </div>

      {/* Project selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedProject(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${!selectedProject ? 'bg-brand-red text-white' : 'bg-brand-black-border text-brand-white-muted hover:text-brand-white'}`}
        >
          Tümü
        </button>
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(p.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedProject === p.id ? 'bg-brand-red text-white' : 'bg-brand-black-border text-brand-white-muted hover:text-brand-white'}`}
          >
            {p.name}
            <StatusBadge status={p.status} type="project" />
          </button>
        ))}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.key)
            return (
              <div key={col.key} className="bg-brand-black-soft border border-brand-black-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.bg.replace('bg-', 'bg-').replace('/10', '')}`} />
                    <h3 className={`text-sm font-bold ${col.color}`}>{col.label}</h3>
                  </div>
                  <span className="text-xs text-brand-white-dim bg-brand-black px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>

                <div className="space-y-2 min-h-[100px]">
                  {colTasks.map(task => (
                    <div key={task.id} className="bg-brand-black-card border border-brand-black-border rounded-lg p-3 group hover:border-brand-red/30 transition-all">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-brand-white leading-snug">{task.title}</p>
                        <StatusBadge status={task.priority} type="priority" />
                      </div>
                      {task.project && <p className="text-xs text-brand-white-dim mb-1">{task.project.name}</p>}
                      {task.assignee && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-4 h-4 bg-brand-red/20 rounded-full flex items-center justify-center">
                            <span className="text-xs text-brand-red font-bold">{task.assignee.full_name.charAt(0)}</span>
                          </div>
                          <span className="text-xs text-brand-white-dim">{task.assignee.full_name}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <p className="text-xs text-brand-white-dim mt-1">
                          📅 {format(new Date(task.due_date), 'd MMM', { locale: tr })}
                        </p>
                      )}
                      {/* Move buttons */}
                      <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {KANBAN_COLUMNS.filter(c => c.key !== col.key).map(c => (
                          <button
                            key={c.key}
                            onClick={() => moveTask(task.id, c.key)}
                            className={`text-xs px-2 py-0.5 rounded ${c.bg} ${c.color} hover:opacity-80 transition-opacity`}
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-brand-white-dim text-xs">Görev yok</div>
                  )}
                </div>

                <button
                  onClick={() => { setShowTaskModal(true); setTaskForm(f => ({ ...f, status: col.key })) }}
                  className="w-full py-2 rounded-lg border border-dashed border-brand-black-border text-brand-white-dim hover:border-brand-red/40 hover:text-brand-red transition-all text-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Görev ekle
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-black-border">
                  <th className="table-header text-left px-4 py-3">Görev</th>
                  <th className="table-header text-left px-4 py-3 hidden md:table-cell">Proje</th>
                  <th className="table-header text-left px-4 py-3">Durum</th>
                  <th className="table-header text-left px-4 py-3">Öncelik</th>
                  <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Atanan</th>
                  <th className="table-header text-left px-4 py-3 hidden lg:table-cell">Son Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-black-border">
                {filteredTasks.length > 0 ? filteredTasks.map(task => (
                  <tr key={task.id} className="hover:bg-brand-black-border/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-brand-white">{task.title}</td>
                    <td className="px-4 py-3 text-sm text-brand-white-muted hidden md:table-cell">{task.project?.name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} type="task" /></td>
                    <td className="px-4 py-3"><StatusBadge status={task.priority} type="priority" /></td>
                    <td className="px-4 py-3 text-sm text-brand-white-muted hidden lg:table-cell">{task.assignee?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-brand-white-dim hidden lg:table-cell">
                      {task.due_date ? format(new Date(task.due_date), 'd MMM yyyy', { locale: tr }) : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-brand-white-dim">Görev bulunamadı</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Yeni Proje</h2>
              <button onClick={() => setShowProjectModal(false)} className="text-brand-white-dim hover:text-brand-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="label">Proje Adı *</label>
                <input className="input" value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Müşteri</label>
                <select className="select" value={projectForm.client_id} onChange={e => setProjectForm(f => ({ ...f, client_id: e.target.value }))}>
                  <option value="">İç proje</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Durum</label>
                <select className="select" value={projectForm.status} onChange={e => setProjectForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="planning">Planlama</option>
                  <option value="active">Aktif</option>
                  <option value="on_hold">Beklemede</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Başlangıç</label>
                  <input type="date" className="input" value={projectForm.start_date} onChange={e => setProjectForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <input type="date" className="input" value={projectForm.deadline} onChange={e => setProjectForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Bütçe (₺)</label>
                <input type="number" className="input" value={projectForm.budget} onChange={e => setProjectForm(f => ({ ...f, budget: e.target.value }))} min="0" />
              </div>
              <div>
                <label className="label">Açıklama</label>
                <textarea className="input resize-none" rows={2} value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
                <button type="button" onClick={() => setShowProjectModal(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-brand-black-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Yeni Görev</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-brand-white-dim hover:text-brand-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="label">Görev Başlığı *</label>
                <input className="input" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required placeholder="Görevi kısaca açıklayın..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Proje</label>
                  <select className="select" value={taskForm.project_id || selectedProject || ''} onChange={e => setTaskForm(f => ({ ...f, project_id: e.target.value }))}>
                    <option value="">Genel görev</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
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
                  <label className="label">Atanan</label>
                  <select className="select" value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}>
                    <option value="">Atanmadı</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Son Tarih</label>
                  <input type="date" className="input" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Açıklama</label>
                <textarea className="input resize-none" rows={2} value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
                <button type="button" onClick={() => setShowTaskModal(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
