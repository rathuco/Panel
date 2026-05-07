'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, FileText, CreditCard, Package,
  FolderKanban, BarChart3, MessageSquare, HandshakeIcon,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  LogOut, Settings, Bell, User,
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
}

interface NavCategory {
  label: string
  roles: string[]
  items: NavItem[]
}

const navCategories: NavCategory[] = [
  {
    label: 'Genel',
    roles: ['super_admin', 'admin', 'employee', 'client'],
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'employee', 'client'] },
    ],
  },
  {
    label: 'Müşteri İlişkileri',
    roles: ['super_admin', 'admin', 'employee'],
    items: [
      { href: '/crm/clients', label: 'Müşteriler', icon: Users, roles: ['super_admin', 'admin', 'employee'] },
      { href: '/crm/tickets', label: 'Destek Biletleri', icon: MessageSquare, roles: ['super_admin', 'admin', 'employee'] },
      { href: '/meetings', label: 'Görüşmeler', icon: HandshakeIcon, roles: ['super_admin', 'admin', 'employee'] },
    ],
  },
  {
    label: 'Destek',
    roles: ['client'],
    items: [
      { href: '/crm/tickets', label: 'Destek Taleplerim', icon: MessageSquare, roles: ['client'] },
    ],
  },
  {
    label: 'Finans',
    roles: ['super_admin', 'admin', 'employee', 'client'],
    items: [
      { href: '/finance/invoices', label: 'Faturalar', icon: FileText, roles: ['super_admin', 'admin', 'employee', 'client'] },
      { href: '/finance/transactions', label: 'Gelir/Gider', icon: CreditCard, roles: ['super_admin', 'admin'] },
    ],
  },
  {
    label: 'Hizmetler',
    roles: ['super_admin', 'admin', 'employee', 'client'],
    items: [
      { href: '/packages', label: 'Paketler', icon: Package, roles: ['super_admin', 'admin', 'employee', 'client'] },
    ],
  },
  {
    label: 'İş Yönetimi',
    roles: ['super_admin', 'admin', 'employee'],
    items: [
      { href: '/projects', label: 'Projeler & Görevler', icon: FolderKanban, roles: ['super_admin', 'admin', 'employee'] },
    ],
  },
  {
    label: 'Raporlar',
    roles: ['super_admin', 'admin'],
    items: [
      { href: '/reports', label: 'Raporlar', icon: BarChart3, roles: ['super_admin', 'admin'] },
    ],
  },
  {
    label: 'Sistem',
    roles: ['super_admin', 'admin', 'employee', 'client'],
    items: [
      { href: '/settings', label: 'Ayarlar', icon: Settings, roles: ['super_admin', 'admin', 'employee', 'client'] },
    ],
  },
]

interface SidebarProps {
  user: Profile
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  // Hangi kategorilerin açık olduğunu tut
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Aktif sayfanın kategorisini otomatik aç
    const initial: Record<string, boolean> = {}
    navCategories.forEach(cat => {
      const hasActive = cat.items.some(item =>
        item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)
      )
      initial[cat.label] = hasActive
    })
    setOpenCategories(initial)
    fetchNotifications()
  }, [pathname])

  const fetchNotifications = async () => {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, title, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5)

    if (tickets && tickets.length > 0) {
      const notifs = tickets.map((t: any) => ({
        id: t.id,
        text: `Açık bilet: ${t.title}`,
        time: new Date(t.created_at).toLocaleDateString('tr-TR'),
        read: false,
      }))
      setNotifications(notifs)
      setNotifCount(notifs.length)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const toggleCategory = (label: string) => {
    if (collapsed) return
    setOpenCategories(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const roleLabel: Record<string, string> = {
    super_admin: 'Süper Admin', admin: 'Yönetici',
    employee: 'Çalışan', client: 'Müşteri',
  }

  // Kullanıcının görebileceği kategorileri filtrele
  const visibleCategories = navCategories
    .filter(cat => cat.roles.includes(user.role))
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.roles.includes(user.role)),
    }))
    .filter(cat => cat.items.length > 0)

  return (
    <aside className={clsx(
      'relative flex flex-col bg-brand-black-soft border-r border-brand-black-border transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo + Bildirim */}
      <div className={clsx(
        'flex items-center border-b border-brand-black-border h-16 px-4 flex-shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-sm">R</span>
        </div>
        {!collapsed && (
          <>
            <span className="text-sm font-black tracking-widest text-brand-white flex-1">RATHUDAN</span>
            <div className="relative">
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="relative p-1.5 rounded-lg text-brand-white-dim hover:text-brand-white hover:bg-brand-black-border transition-all"
              >
                <Bell className="w-4 h-4" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red rounded-full flex items-center justify-center text-white text-[10px] font-black leading-none">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-brand-black-card border border-brand-black-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-brand-black-border">
                    <span className="text-sm font-bold text-brand-white">Bildirimler</span>
                    {notifCount > 0 && <span className="badge-red">{notifCount} yeni</span>}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map(n => (
                      <Link
                        key={n.id}
                        href={`/crm/tickets/${n.id}`}
                        onClick={() => setShowNotif(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-brand-black-border transition-colors border-b border-brand-black-border/50 last:border-0"
                      >
                        <div className="w-2 h-2 bg-brand-red rounded-full mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-brand-white leading-snug">{n.text}</p>
                          <p className="text-xs text-brand-white-dim mt-0.5">{n.time}</p>
                        </div>
                      </Link>
                    )) : (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-6 h-6 text-brand-black-border mx-auto mb-2" />
                        <p className="text-xs text-brand-white-dim">Bildirim yok</p>
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-brand-black-border">
                      <Link href="/crm/tickets" onClick={() => setShowNotif(false)} className="text-xs text-brand-red hover:underline">
                        Tüm biletleri gör →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        {collapsed && (
          <div className="relative mt-1">
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-1 rounded-lg text-brand-white-dim hover:text-brand-white transition-all">
              <Bell className="w-4 h-4" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-red rounded-full flex items-center justify-center text-white text-[9px] font-black">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {visibleCategories.map((cat) => {
          const isOpen = openCategories[cat.label] ?? false
          const hasActiveItem = cat.items.some(item =>
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          )

          return (
            <div key={cat.label} className="mb-1">
              {/* Kategori başlığı — Genel kategorisi için başlık gösterme */}
              {cat.label !== 'Genel' && !collapsed && (
                <button
                  onClick={() => toggleCategory(cat.label)}
                  className={clsx(
                    'w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all',
                    hasActiveItem ? 'text-brand-red' : 'text-brand-white-dim hover:text-brand-white-muted'
                  )}
                >
                  <span>{cat.label}</span>
                  {isOpen
                    ? <ChevronUp className="w-3 h-3" />
                    : <ChevronDown className="w-3 h-3" />
                  }
                </button>
              )}

              {/* Kategori separator collapsed modda */}
              {cat.label !== 'Genel' && collapsed && (
                <div className="mx-3 my-1 border-t border-brand-black-border" />
              )}

              {/* Nav item'ları */}
              {(cat.label === 'Genel' || isOpen || collapsed) && (
                <ul className={clsx('space-y-0.5 px-2', !collapsed && cat.label !== 'Genel' && 'mt-0.5')}>
                  {cat.items.map((item) => {
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
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative',
                            collapsed ? 'justify-center' : '',
                            isActive
                              ? 'bg-brand-red/15 text-brand-red border border-brand-red/20'
                              : 'text-brand-white-muted hover:bg-brand-black-border hover:text-brand-white'
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
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
              )}
            </div>
          )
        })}
      </nav>

      {/* Kullanıcı */}
      <div className="border-t border-brand-black-border p-3 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 bg-brand-red rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{user.full_name?.charAt(0).toUpperCase()}</span>
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

      {/* Collapse butonu */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-brand-black-border border border-brand-black-border rounded-full flex items-center justify-center text-brand-white-muted hover:text-brand-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Backdrop */}
      {showNotif && <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />}
    </aside>
  )
}
