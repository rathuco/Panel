export type UserRole = 'super_admin' | 'admin' | 'employee' | 'client'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type TransactionType = 'income' | 'expense'

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type PackageStatus = 'active' | 'expired' | 'cancelled' | 'pending'

export type MeetingType = 'face_to_face' | 'online' | 'phone'
export type MeetingOutcome = 'successful' | 'follow_up_needed' | 'no_decision' | 'cancelled'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  phone?: string
  department?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone?: string
  address?: string
  city?: string
  tax_number?: string
  assigned_employee_id?: string
  assigned_employee?: Profile
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  client_id: string
  client?: Client
  assigned_to?: string
  assignee?: Profile
  created_by: string
  creator?: Profile
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface TicketComment {
  id: string
  ticket_id: string
  author_id: string
  author?: Profile
  content: string
  is_internal: boolean
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  client?: Client
  created_by: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes?: string
  items: InvoiceItem[]
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Transaction {
  id: string
  client_id?: string
  client?: Client
  invoice_id?: string
  type: TransactionType
  amount: number
  currency: string
  category: string
  description: string
  date: string
  created_by: string
  created_at: string
}

export interface Package {
  id: string
  name: string
  description?: string
  price: number
  billing_period: 'monthly' | 'quarterly' | 'yearly' | 'one_time'
  features: string[]
  is_active: boolean
  created_at: string
}

export interface ClientPackage {
  id: string
  client_id: string
  client?: Client
  package_id: string
  package?: Package
  status: PackageStatus
  start_date: string
  end_date?: string
  custom_price?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  client_id?: string
  client?: Client
  name: string
  description?: string
  status: ProjectStatus
  start_date?: string
  deadline?: string
  budget?: number
  manager_id?: string
  manager?: Profile
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id?: string
  project?: Project
  assigned_to?: string
  assignee?: Profile
  created_by: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  client_id: string
  client?: Client
  employee_id: string
  employee?: Profile
  title: string
  meeting_type: MeetingType
  date: string
  duration_minutes: number
  location?: string
  agenda?: string
  summary?: string
  outcome?: MeetingOutcome
  next_steps?: string
  follow_up_date?: string
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_clients: number
  active_clients: number
  open_tickets: number
  monthly_revenue: number
  pending_invoices: number
  active_projects: number
  pending_tasks: number
  meetings_this_month: number
}
