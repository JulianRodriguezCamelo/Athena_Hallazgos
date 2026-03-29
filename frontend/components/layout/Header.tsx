'use client'

import { Bell, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { useAuth } from '@/lib/auth'
import { ROL_LABELS } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  return (
    <header className="bg-card border-b border-border px-4 lg:px-6 h-14 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-5 hidden lg:block" />
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button suppressHydrationWarning
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="relative p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Cambiar tema"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        <button className="relative p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <div className="hidden sm:flex items-center gap-2">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {user?.nombre?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-foreground leading-tight">{user?.nombre}</p>
            <p className="text-[10px] text-muted-foreground">
              {user ? ROL_LABELS[user.rol] : ''}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
