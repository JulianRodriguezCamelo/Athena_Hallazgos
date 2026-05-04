'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Send, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalCambiarEstado } from '@/components/organisms/modals/ModalCambiarEstado'
import { ModalNotificacionPersonalizada } from '@/components/organisms/modals/ModalNotificacionPersonalizada'
import type { HallazgoRow } from '@/types'

interface Props {
  hallazgos: HallazgoRow[]
  onAtendido?: () => void
}

export function AlertasCriticasPanel({ hallazgos, onAtendido }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [atenderH, setAtenderH] = useState<HallazgoRow | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)

  const vencidas = hallazgos.filter(h => h.dias_restantes < 0)
  const criticas = hallazgos.filter(h => h.dias_restantes >= 0 && h.dias_restantes <= 7)
  const todas = [...vencidas, ...criticas]

  if (todas.length === 0) return null

  return (
    <>
      <div className={cn(
        'rounded-xl border-2 overflow-hidden',
        vencidas.length > 0
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-amber-500/40 bg-amber-500/5',
      )}>
        {/* Banner principal — compacto */}
        <div className="flex items-center gap-3 px-5 py-3">
          <AlertTriangle className={cn('h-4 w-4 shrink-0', vencidas.length > 0 ? 'text-destructive' : 'text-amber-500')} />

          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <span className="text-sm font-semibold">Alertas Críticas</span>
            {vencidas.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">{vencidas.length} vencidas</Badge>
            )}
            {criticas.length > 0 && (
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">{criticas.length} críticas</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={vencidas.length > 0 ? 'destructive' : 'default'}
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => setNotifOpen(true)}
            >
              <Send className="h-3 w-3" />
              Notificar responsables
            </Button>
            <button
              type="button"
              className="p-1 rounded hover:bg-muted/20 transition-colors text-muted-foreground"
              onClick={() => setExpanded(e => !e)}
              title={expanded ? 'Ocultar detalle' : 'Ver detalle'}
            >
              {expanded
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Lista desplegable — secundaria */}
        {expanded && (
          <div className="border-t border-border/40 divide-y divide-border/20">
            {todas.map(h => {
              const isVencido = h.dias_restantes < 0
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/10 transition-colors"
                >
                  <span className="font-mono text-xs font-bold text-primary shrink-0">
                    {h.codigo_del_hallazgo ?? '—'}
                  </span>
                  <Badge
                    variant={isVencido ? 'destructive' : 'outline'}
                    className={cn('text-[10px] shrink-0', !isVencido && 'bg-amber-500/10 text-amber-600 border-amber-500/20')}
                  >
                    {isVencido ? `Vencido ${Math.abs(h.dias_restantes)}d` : `${h.dias_restantes}d restantes`}
                  </Badge>
                  <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                    {h.descripcion ?? '—'}
                  </p>
                  {h.responsable_plan_accion && (
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 hidden sm:block">
                      {h.responsable_plan_accion}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] gap-1 shrink-0 hover:text-primary"
                    onClick={() => setAtenderH(h)}
                  >
                    <Play className="h-2.5 w-2.5" />
                    Atender
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ModalCambiarEstado
        h={atenderH}
        open={!!atenderH}
        onClose={() => setAtenderH(null)}
        onSaved={() => { setAtenderH(null); onAtendido?.() }}
      />

      <ModalNotificacionPersonalizada
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
    </>
  )
}
