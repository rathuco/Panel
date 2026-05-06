'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Lock, Trash2, UserCheck, AlertTriangle } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [ticket, setTicket] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchAll() }, [params.id])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: p }, { data: t }, { data: c }, { data: emp }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('tickets').select('*, client:clients(company_name), assignee:profiles!tickets_assigned_to_fkey(full_name, id)').eq('id', params.id).single(),
      supabase.from('ticket_comments').select('*, author:profiles!ticket_comments_author_id_fkey(full_name, role)').eq('ticket_id', params.id).order('created_at', { ascending: true }),
      supabase.from('profiles').select('id, full_name').in('role', ['super_admin', 'admin', 'employee']).eq('is_active', true),
    ])

    setProfile(p)
    setTicket(t)
    setComments(c || [])
    setEmployees(emp || [])
    setLoading(false)
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ticket_comments').insert([{
      ticket_id: params.id,
      author_id: user!.id,
      content: newComment,
      is_internal: isInternal,
    }])

    setNewComment('')
    setSubmitting(false)
    fetchAll()
  }

  const updateStatus = async (status: string) => {
    await supabase.from('tickets').update({
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    }).eq('id', params.id)
    fetchAll()
  }

  const updateAssignee = async (assigneeId: string) => {
    await supabase.from('tickets').update({
      assigned_to: assigneeId || null,
    }).eq('id', params.id)
    fetchAll()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('ticket_comments').delete().eq('ticket_id', params.id)
    await supabase.from('tickets').delete().eq('id', params.id)
    setDeleting(false)
    router.push('/crm/tickets')
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
    </div>
  )

  if (!ticket) return (
    <div className="p-6 text-center">
      <p className="text-brand-white-dim">Bilet bulunamadı</p>
      <Link href="/crm/tickets" className="text-brand-red text-sm hover:underline mt-2 inline-block">← Biletlere Dön</Link>
    </div>
  )

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')
  const isClient = profile?.role === 'client'
  const isOwner = ticket.created_by === profile?.id
  const hasResponse = comments.some((c: any) => !c.is_internal && c.author_id !== ticket.created_by)
  const canDelete = isAdmin || (isClient && isOwner && !hasResponse)

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/crm/tickets" className="btn-ghost mt-1">
            <ArrowLeft className="w-4 h-4" />
            Biletler
          </Link>
          <div>
            <h1 className="page-title">{ticket.title}</h1>
            <p className="text-brand-white-dim text-sm mt-0.5">{ticket.client?.company_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isAdmin && (
            <div className="flex gap-1.5 flex-wrap">
              {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    ticket.status === s
                      ? 'bg-brand-red border-brand-red text-white'
                      : 'border-brand-black-border text-brand-white-muted hover:border-brand-red/40'
                  }`}
                >
                  {{ open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapalı' }[s]}
                </button>
              ))}
            </div>
          )}

          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Sil
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="section-title">Bilet Detayları</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-brand-white-dim">Durum</span>
                <StatusBadge status={ticket.status} type="ticket" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-white-dim">Öncelik</span>
                <StatusBadge status={ticket.priority} type="priority" />
              </div>
              {ticket.category && (
                <div className="flex justify-between items-center">
                  <span className="text-brand-white-dim">Kategori</span>
                  <span className="text-brand-white-muted">{ticket.category}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-brand-white-dim">Oluşturulma</span>
                <span className="text-brand-white-muted text-xs">
                  {format(new Date(ticket.created_at), 'd MMM yyyy HH:mm', { locale: tr })}
                </span>
              </div>
              {ticket.resolved_at && (
                <div className="flex justify-between items-center">
                  <span className="text-brand-white-dim">Çözüm</span>
                  <span className="text-brand-white-muted text-xs">
                    {format(new Date(ticket.resolved_at), 'd MMM yyyy HH:mm', { locale: tr })}
                  </span>
                </div>
              )}
            </div>
            <div className="border-t border-brand-black-border pt-4">
              <p className="text-xs text-brand-white-dim mb-2">Açıklama</p>
              <p className="text-sm text-brand-white-muted leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="card space-y-3">
              <h2 className="section-title flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-red" />
                Çalışan Ataması
              </h2>
              <select
                className="select"
                value={ticket.assignee?.id || ''}
                onChange={e => updateAssignee(e.target.value)}
              >
                <option value="">Atanmadı</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
              {ticket.assignee && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-5 h-5 bg-brand-red/10 rounded-full flex items-center justify-center">
                    <span className="text-xs text-brand-red font-bold">
                      {ticket.assignee.full_name?.charAt(0)}
                    </span>
                  </div>
                  <span className="text-xs text-brand-white-muted">{ticket.assignee.full_name} atandı</span>
                </div>
              )}
            </div>
          )}

          {!isAdmin && !isClient && ticket.assignee && (
            <div className="card">
              <p className="text-xs text-brand-white-dim mb-2">Atanan Çalışan</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-brand-red/10 rounded-full flex items-center justify-center">
                  <span className="text-xs text-brand-red font-bold">{ticket.assignee.full_name?.charAt(0)}</span>
                </div>
                <span className="text-sm text-brand-white">{ticket.assignee.full_name}</span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="card space-y-4">
            <h2 className="section-title">
              {isClient ? 'İletişim' : 'Yorumlar'} ({comments.filter(c => isAdmin || !c.is_internal).length})
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.filter(c => isAdmin || !c.is_internal).length > 0 ? (
                comments
                  .filter(c => isAdmin || !c.is_internal)
                  .map(comment => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-xl ${
                        comment.is_internal
                          ? 'bg-amber-500/5 border border-amber-500/20'
                          : comment.author?.role === 'client'
                            ? 'bg-blue-500/5 border border-blue-500/20'
                            : 'bg-brand-black border border-brand-black-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-brand-red/10 rounded-full flex items-center justify-center">
                            <span className="text-xs text-brand-red font-bold">
                              {comment.author?.full_name?.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-brand-white">
                            {comment.author?.full_name}
                          </span>
                          {comment.is_internal && (
                            <span className="flex items-center gap-1 text-xs text-amber-400">
                              <Lock className="w-3 h-3" /> İç Not
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-brand-white-dim">
                          {format(new Date(comment.created_at), 'd MMM HH:mm', { locale: tr })}
                        </span>
                      </div>
                      <p className="text-sm text-brand-white-muted leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-brand-white-dim text-sm text-center py-6">
                  {isClient ? 'Henüz yanıt yok' : 'Henüz yorum yok'}
                </p>
              )}
            </div>

            {ticket.status !== 'closed' && (
              <form onSubmit={handleComment} className="border-t border-brand-black-border pt-4 space-y-3">
                <textarea
                  className="input min-h-[80px] resize-none"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={isClient ? 'Yanıt yazın...' : 'Yorum yazın...'}
                />
                <div className="flex items-center justify-between">
                  {isAdmin && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={e => setIsInternal(e.target.checked)}
                        className="accent-amber-400"
                      />
                      <span className="text-sm text-brand-white-muted flex items-center gap-1">
                        <Lock className="w-3 h-3" /> İç not (sadece personel)
                      </span>
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="btn-primary ml-auto disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {isClient ? 'Gönder' : 'Yorum Ekle'}
                  </button>
                </div>
              </form>
            )}

            {ticket.status === 'closed' && (
              <div className="border-t border-brand-black-border pt-4">
                <p className="text-xs text-brand-white-dim text-center">
                  Bu bilet kapatılmıştır. Yeni bir talep oluşturabilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-black-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-white">Bileti Sil</h2>
                <p className="text-xs text-brand-white-dim">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5">
              <p className="text-sm text-brand-white-muted">
                <span className="font-semibold text-brand-white">"{ticket.title}"</span> başlıklı bilet ve tüm yorumları kalıcı olarak silinecek.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm"
              >
                {deleting
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
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
