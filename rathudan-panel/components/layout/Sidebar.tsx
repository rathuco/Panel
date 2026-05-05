'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Package,
  FolderKanban,
  BarChart3,
  Settings,
  MessageSquare,
  HandshakeIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import { clsx } from 'clsx'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: string[]
  badge?: number
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'employee', 'client'] },
  { href: '/crm/clients', label: 'Müşteriler', icon: Users, roles: ['super_admin', 'admin', 'employee'] },
  { href: '/crm/tickets', label: 'Destek Biletleri', icon: MessageSquare, roles: ['super_admin', 'admin', 'employee', 'client'] },
  { href: '/finance/invoices', label: 'Faturalar', icon: FileText, roles: ['super_admin', 'admin', 'employee', 'client'] },
  { href: '/finance/transactions', label: 'Gelir/Gider', icon: CreditCard, roles: ['super_admin', 'admin'] },
  { href: '/packages', label: 'Paketlerim', icon: Package, roles: ['super_admin', 'admin', 'employee', 'client'] },
  { href: '/projects', label: 'Projeler & Görevler', icon: FolderKanban, roles: ['super_admin', 'admin', 'employee'] },
  { href: '/meetings', label: 'Görüşmeler', icon: HandshakeIcon, roles: ['super_admin', 'admin', 'employee'] },
  { href: '/reports', label: 'Raporlar', icon: BarChart3, roles: ['super_admin', 'admin'] },
  { href: '/admin/users', label: 'Kullanıcılar', icon: Shield, roles: ['super_admin', 'admin'] },
]

interface SidebarProps {
  user: Profile
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role))

  const roleLabel: Record<string, string> = {
    super_admin: 'Süper Admin',
    admin: 'Yönetici',
    employee: 'Çalışan',
    client: 'Müşteri',
  }

  return (
    <aside
      className={clsx(
        'relative flex flex-col bg-brand-black-soft border-r border-brand-black-border transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center border-b border-brand-black-border h-16 px-4 flex-shrink-0', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-sm">R</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-black tracking-widest text-brand-white">
            RATHUDAN
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                    collapsed ? 'justify-center' : '',
                    isActive
                      ? 'bg-brand-red/15 text-brand-red border border-brand-red/20'
                      : 'text-brand-white-muted hover:bg-brand-black-border hover:text-brand-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={clsx('flex-shrink-0', isActive ? 'w-4 h-4' : 'w-4 h-4')} />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="absolute right-2 w-1.5 h-1.5 bg-brand-red rounded-full" />
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 bg-brand-black-border text-brand-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-brand-black-border p-3 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 bg-brand-red rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {user.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand-white truncate">{user.full_name}</p>
              <p className="text-xs text-brand-white-dim">{roleLabel[user.role]}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-brand-white-dim hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-sm',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'Çıkış Yap' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Çıkış Yap'}
        </button>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-brand-black-border border border-brand-black-border rounded-full flex items-center justify-center text-brand-white-muted hover:text-brand-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}
