import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes(profile?.role || '')) redirect('/dashboard')

  // Get last 6 months of transactions
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [
    { data: transactions },
    { data: clients },
    { data: tickets },
    { data: meetings },
    { data: projects },
  ] = await Promise.all([
    supabase.from('transactions').select('type, amount, date, category').gte('date', sixMonthsAgo.toISOString().split('T')[0]).order('date'),
    supabase.from('clients').select('is_active, created_at').order('created_at'),
    supabase.from('tickets').select('status, priority, created_at').order('created_at'),
    supabase.from('meetings').select('meeting_type, outcome, date').order('date'),
    supabase.from('projects').select('status, created_at').order('created_at'),
  ])

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-red" />
          Raporlar & Analitik
        </h1>
        <p className="text-brand-white-dim text-sm mt-1">Son 6 aylık veriler</p>
      </div>
      <ReportsClient
        transactions={transactions || []}
        clients={clients || []}
        tickets={tickets || []}
        meetings={meetings || []}
        projects={projects || []}
      />
    </div>
  )
}
