'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileSearch,
  Upload,
  Users,
  LogOut,
  ClipboardList,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { ROL_LABELS } from '@/lib/utils'
import {
  Sidebar as ShadSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  sidebarMenuButtonVariants,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['administrador', 'vicepresidente', 'directivo', 'profesional', 'gestor'],
  },
  {
    href: '/hallazgos',
    label: 'Hallazgos',
    icon: FileSearch,
    roles: ['administrador', 'vicepresidente', 'directivo', 'profesional', 'gestor'],
  },
  {
    href: '/mis-actividades',
    label: 'Mis Actividades',
    icon: ClipboardList,
    roles: ['directivo', 'profesional', 'gestor'],
  },
  {
    href: '/uploads',
    label: 'Carga de datos',
    icon: Upload,
    roles: ['administrador'],
  },
  {
    href: '/usuarios',
    label: 'Usuarios',
    icon: Users,
    roles: ['administrador'],
  },
]


export default function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { setOpenMobile } = useSidebar()

  const visible = navItems.filter(
    (item) => user && item.roles.includes(user.rol)
  )

  return (
    <ShadSidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border px-2 py-2">
        <div className="flex items-center gap-2">
          <div className="shrink-0 w-14 h-14 flex items-center justify-center">
            <Image
              src="/logo-athenea.png"
              alt="Athenea"
              width={56}
              height={56}
              className="w-full h-full object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-sidebar-foreground leading-tight">
              Hallazgos ERO
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">
              Fiduprevisora
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpenMobile(false)}
                      data-active={active || undefined}
                      className={sidebarMenuButtonVariants({ variant: 'default', size: 'default' })}
                    >
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User / Logout */}
      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-sidebar-accent/60 mb-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
              {user?.nombre?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">
              {user?.nombre}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 capitalize">
              {user ? ROL_LABELS[user.rol] : ''}
            </p>
          </div>
        </div>
        <SidebarSeparator className="my-1 bg-sidebar-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className={cn(
            'w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
          )}
        >
          <LogOut className="w-4 h-4" />
          <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
        </Button>
      </SidebarFooter>
    </ShadSidebar>
  )
}