'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Lock, Globe, Clock } from 'lucide-react'
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
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [params.id])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: p }, { data: t }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('tickets').select('*, client:clients(company_name), assignee:profiles(full_name)').eq('id', params.id).single(),
      supabase.from('ticket_comments').select('*, author:profiles(full_name, role)').eq('ticket_id', params.id).order('created_at', { ascending: true }),
    ])

    setProfile(p)
    setTicket(t)
    setComments(c || [])
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

  if (loading) return <div className="p-6 text-brand-white-dim">Yükleniyor...</div>
  if (!ticket) return <div className="p-6 text-brand-white-dim">Bilet bulunamadı</div>

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '')

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm/tickets" className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            Biletler
          </Link>
          <div>
            <h1 className="page-title">{ticket.title}</h1>
            <p className="text-brand-white-dim text-sm">{ticket.client?.company_name}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {(['open', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${ticket.status === s ? 'bg-brand-red border-brand-red text-white' : 'border-brand-black-border text-brand-white-muted hover:border-brand-red/40'}`}
              >
                {{ open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapalı' }[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket info */}
        <div className="card space-y-4">
          <h2 className="section-title">Bilet Detayları</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-white-dim">Durum</span>
              <StatusBadge status={ticket.status} type="ticket" />
            </div>
            <div className="flex justify-between">
              <span className="text-brand-white-dim">Öncelik</span>
              <StatusBadge status={ticket.priority} type="priority" />
            </div>
            {ticket.category && (
              <div className="flex justify-between">
                <span className="text-brand-white-dim">Kategori</span>
                <span className="text-brand-white-muted">{ticket.category}</span>
              </div>
            )}
            {ticket.assignee && (
              <div className="flex justify-between">
                <span className="text-brand-white-dim">Atanan</span>
                <span className="text-brand-white-muted">{ticket.assignee.full_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-brand-white-dim">Oluşturulma</span>
              <span className="text-brand-white-muted text-xs">{format(new Date(ticket.created_at), 'd MMM yyyy HH:mm', { locale: tr })}</span>
            </div>
            {ticket.resolved_at && (
              <div className="flex justify-between">
                <span className="text-brand-white-dim">Çözüm</span>
                <span className="text-brand-white-muted text-xs">{format(new Date(ticket.resolved_at), 'd MMM yyyy HH:mm', { locale: tr })}</span>
              </div>
            )}
          </div>
          <div className="border-t border-brand-black-border pt-4">
            <p className="text-xs text-brand-white-dim mb-2">Açıklama</p>
            <p className="text-sm text-brand-white-muted leading-relaxed">{ticket.description}</p>
          </div>
        </div>

        {/* Comments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-4">
            <h2 className="section-title">Yorumlar ({comments.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-xl ${comment.is_internal ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-brand-black border border-brand-black-border'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-brand-red/10 rounded-full flex items-center justify-center">
                          <span className="text-xs text-brand-red font-bold">{comment.author?.full_name?.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-brand-white">{comment.author?.full_name}</span>
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
                    <p className="text-sm text-brand-white-muted leading-relaxed">{comment.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-brand-white-dim text-sm text-center py-6">Henüz yorum yok</p>
              )}
            </div>

            {/* Add comment */}
            <form onSubmit={handleComment} className="border-t border-brand-black-border pt-4 space-y-3">
              <textarea
                className="input min-h-[80px] resize-none"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Yorum yazın..."
              />
              <div className="flex items-center justify-between">
                {isAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="accent-amber-400" />
                    <span className="text-sm text-brand-white-muted flex items-center gap-1">
                      <Lock className="w-3 h-3" /> İç not (sadece personel)
                    </span>
                  </label>
                )}
                <button type="submit" disabled={submitting || !newComment.trim()} className="btn-primary ml-auto disabled:opacity-50">
                  <Send className="w-4 h-4" />
                  Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
