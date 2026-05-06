'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppSidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '@/lib/auth'
import { PageLoader } from '@/components/ui/Spinner'
import { SidebarProvider } from '@/components/ui/sidebar'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/hallazgos': 'Hallazgos ERO',
  '/uploads': 'Carga de datos',
  '/usuarios': 'Gestión de usuarios',
  '/auditoria': 'Auditoría del sistema',
}

interface DashboardShellProps {
  children: React.ReactNode
  pathname: string
}

export default function DashboardShell({ children, pathname }: DashboardShellProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PageLoader />
      </div>
    )
  }

  const title =
    Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'Panel'

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header title={title} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
