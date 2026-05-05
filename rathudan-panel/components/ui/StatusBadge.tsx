import { clsx } from 'clsx'

interface BadgeProps {
  status: string
  type?: 'ticket' | 'invoice' | 'project' | 'task' | 'package' | 'meeting' | 'priority' | 'role'
}

const configs: Record<string, Record<string, string>> = {
  ticket: {
    open: 'badge-blue',
    in_progress: 'badge-yellow',
    resolved: 'badge-green',
    closed: 'badge-gray',
  },
  invoice: {
    draft: 'badge-gray',
    sent: 'badge-blue',
    paid: 'badge-green',
    overdue: 'badge-red',
    cancelled: 'badge-gray',
  },
  project: {
    planning: 'badge-blue',
    active: 'badge-green',
    on_hold: 'badge-yellow',
    completed: 'badge-purple',
    cancelled: 'badge-gray',
  },
  task: {
    todo: 'badge-gray',
    in_progress: 'badge-blue',
    review: 'badge-yellow',
    done: 'badge-green',
  },
  package: {
    active: 'badge-green',
    expired: 'badge-red',
    cancelled: 'badge-gray',
    pending: 'badge-yellow',
  },
  meeting: {
    successful: 'badge-green',
    follow_up_needed: 'badge-yellow',
    no_decision: 'badge-gray',
    cancelled: 'badge-red',
  },
  priority: {
    low: 'badge-gray',
    medium: 'badge-blue',
    high: 'badge-yellow',
    urgent: 'badge-red',
  },
  role: {
    super_admin: 'badge-red',
    admin: 'badge-purple',
    employee: 'badge-blue',
    client: 'badge-green',
  },
}

const labels: Record<string, Record<string, string>> = {
  ticket: { open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapatıldı' },
  invoice: { draft: 'Taslak', sent: 'Gönderildi', paid: 'Ödendi', overdue: 'Gecikmiş', cancelled: 'İptal' },
  project: { planning: 'Planlama', active: 'Aktif', on_hold: 'Beklemede', completed: 'Tamamlandı', cancelled: 'İptal' },
  task: { todo: 'Yapılacak', in_progress: 'İşlemde', review: 'İncelemede', done: 'Tamamlandı' },
  package: { active: 'Aktif', expired: 'Sona Erdi', cancelled: 'İptal', pending: 'Beklemede' },
  meeting: { successful: 'Başarılı', follow_up_needed: 'Takip Gerekli', no_decision: 'Karar Yok', cancelled: 'İptal' },
  priority: { low: 'Düşük', medium: 'Orta', high: 'Yüksek', urgent: 'Acil' },
  role: { super_admin: 'Süper Admin', admin: 'Yönetici', employee: 'Çalışan', client: 'Müşteri' },
}

const meetingTypeLabels: Record<string, string> = {
  face_to_face: 'Yüz Yüze',
  online: 'Online',
  phone: 'Telefon',
}

export default function StatusBadge({ status, type = 'ticket' }: BadgeProps) {
  const config = configs[type] || {}
  const labelMap = labels[type] || {}
  const badgeClass = config[status] || 'badge-gray'
  const label = labelMap[status] || meetingTypeLabels[status] || status

  return <span className={badgeClass}>{label}</span>
}
