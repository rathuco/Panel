'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FolderKanban, Plus, Users, Calendar, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function ProjectsPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const { data: proj } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(company_name),
        manager:profiles!projects_manager_id_fkey(full_name),
        members:project_members(
          id, is_leader,
          user:profiles(id, full_name)
        )
      `)
      .order('created_at', { ascending: false })

    setProjects(proj || [])
    setLoading(false)
  }

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')

  const statusColors: Record<string, string> = {
    planning: 'border-blue-500/30 bg-blue-500/5',
    active: 'border-emerald-500/30 bg-emerald-500/5',
    on_hold: 'border-amber-500/30 bg-amber-500/5',
    completed: 'border-purple-500/30 bg-purple-500/5',
    cancelled: 'border-gray-500/30 bg-gray-500/5',
  }

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
            <FolderKanban className="w-6 h-6 text-brand-red" />
            Projeler
          </h1>
          <p className="text-brand-white-dim text-sm mt-1">{projects.length} proje</p>
        </div>
        {isAdmin && (
          <Link href="/projects/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Yeni Proje
          </Link>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const).map(status => {
          const count = projects.filter(p => p.status === status).length
          const labels: Record<string, string> = { planning: 'Planlama', active: 'Aktif', on_hold: 'Beklemede', completed: 'Tamamlandı', cancelled: 'İptal' }
          return (
            <div key={status} className="card py-3 flex items-center justify-between">
              <span className="text-xs text-brand-white-muted">{labels[status]}</span>
              <span className="text-lg font-black text-brand-white">{count}</span>
            </div>
          )
        })}
      </div>

      {/* Proje kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map(project => {
          const leader = project.members?.find((m: any) => m.is_leader)
          const memberCount = project.members?.length || 0

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={`card-hover block border ${statusColors[project.status] || 'border-brand-black-border'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-brand-white truncate">{project.name}</h3>
                  {project.client && (
                    <p className="text-xs text-brand-white-dim mt-0.5">{project.client.company_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <StatusBadge status={project.status} type="project" />
                  <ChevronRight className="w-4 h-4 text-brand-white-dim" />
                </div>
              </div>

              {project.description && (
                <p className="text-xs text-brand-white-dim mb-3 line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-brand-black-border">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-brand-white-dim" />
                  <span className="text-xs text-brand-white-dim">{memberCount} üye</span>
                  {leader && (
                    <span className="text-xs text-brand-red">· {leader.user?.full_name}</span>
                  )}
                </div>
                {project.deadline && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-brand-white-dim" />
                    <span className="text-xs text-brand-white-dim">
                      {format(new Date(project.deadline), 'd MMM', { locale: tr })}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}

        {projects.length === 0 && (
          <div className="col-span-3 card text-center py-16">
            <FolderKanban className="w-10 h-10 text-brand-black-border mx-auto mb-3" />
            <p className="text-brand-white-dim">Henüz proje yok</p>
            {isAdmin && (
              <Link href="/projects/new" className="text-brand-red text-sm hover:underline mt-2 inline-block">
                İlk projeyi oluşturun →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
