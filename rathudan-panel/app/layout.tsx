import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'Rathudan Yönetim Paneli',
  description: 'Rathudan Dijital Ajans - Kurumsal Yönetim Sistemi',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={montserrat.variable}>
      <body className="font-sans bg-brand-black text-brand-white antialiased">
        {children}
      </body>
    </html>
  )
}
