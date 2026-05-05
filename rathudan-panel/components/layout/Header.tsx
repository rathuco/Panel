'use client'

import { Bell, Search } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="h-16 bg-brand-black-soft border-b border-brand-black-border flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-lg font-bold text-brand-white">{title}</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-2 rounded-lg text-brand-white-dim hover:text-brand-white hover:bg-brand-black-border transition-all"
        >
          <Search className="w-4 h-4" />
        </button>
        <button className="relative p-2 rounded-lg text-brand-white-dim hover:text-brand-white hover:bg-brand-black-border transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-red rounded-full" />
        </button>
      </div>
    </header>
  )
}
