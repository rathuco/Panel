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
