'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, AlertTriangle, Clock, RefreshCw, Tag, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { notificacionesApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Notificacion {
  id: number
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
  hallazgo_id: number | null
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  alerta:       { label: 'Alerta',       icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-500 bg-red-500/10' },
  vencimiento:  { label: 'Vencimiento',  icon: <Clock className="w-3 h-3" />,         color: 'text-orange-500 bg-orange-500/10' },
  actualizacion:{ label: 'Actualización',icon: <RefreshCw className="w-3 h-3" />,     color: 'text-blue-500 bg-blue-500/10' },
  asignacion:   { label: 'Asignación',   icon: <Tag className="w-3 h-3" />,           color: 'text-violet-500 bg-violet-500/10' },
  prorroga:     { label: 'Prórroga',     icon: <Zap className="w-3 h-3" />,           color: 'text-yellow-500 bg-yellow-500/10' },
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.read).length

  const fetchNotifs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await notificacionesApi.list() as { data: Notificacion[] }
      setNotifs(data)
    } catch {
      // silencioso — no romper el layout
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifs])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleMarkRead(id: number) {
    try {
      await notificacionesApi.markRead(id)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {
      toast.error('No se pudo marcar como leída')
    }
  }

  async function handleMarkAll() {
    try {
      await notificacionesApi.markAllRead()
      setNotifs(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('Todas las notificaciones marcadas como leídas')
    } catch {
      toast.error('No se pudo actualizar las notificaciones')
    }
  }

  function timeAgo(iso: string) {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es })
    } catch {
      return ''
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">Notificaciones</span>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {unread} nuevas
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {loading && notifs.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                Cargando...
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Bell className="w-8 h-8 opacity-20" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notifs.map(notif => {
                const cfg = TYPE_CONFIG[notif.type] ?? { label: notif.type, icon: <Bell className="w-3 h-3" />, color: 'text-muted-foreground bg-muted' }
                return (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${!notif.read ? 'bg-primary/[0.03]' : ''}`}
                  >
                    {/* Dot unread */}
                    <div className="flex-shrink-0 mt-1">
                      {!notif.read
                        ? <span className="block w-2 h-2 rounded-full bg-primary mt-0.5" />
                        : <span className="block w-2 h-2" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Type badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-600 px-1.5 py-0.5 rounded-full mb-1 ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      <p className={`text-xs leading-snug mb-0.5 truncate ${!notif.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.created_at)}</p>
                    </div>

                    {/* Mark read */}
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="flex-shrink-0 mt-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Marcar como leída"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground text-center">
                {notifs.length} notificacion{notifs.length !== 1 ? 'es' : ''} en total
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
