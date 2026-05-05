import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-8xl font-black text-brand-red mb-4">404</p>
        <h1 className="text-2xl font-bold text-brand-white mb-2">Sayfa Bulunamadı</h1>
        <p className="text-brand-white-dim mb-6">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
        <Link href="/dashboard" className="btn-primary inline-flex">
          Dashboard'a Dön
        </Link>
      </div>
    </div>
  )
}
