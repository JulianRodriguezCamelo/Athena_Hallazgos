'use client'

import { useState } from 'react'
import { Calendar, CheckCircle2, ChevronDown } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MiniRadialProgress } from '@/components/atoms/MiniRadialProgress'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import type { ActividadRow } from '@/types'

export interface HallazgoGroup {
  id: number
  codigo: string
  descripcion: string
  estado: string
  actividades: ActividadRow[]
  completadas: number
  total: number
}

export function groupActivitiesByHallazgo(actividades: ActividadRow[]): HallazgoGroup[] {
  const grouped = new Map<string, HallazgoGroup>()
  actividades.forEach((act) => {
    const codigo = act.codigo_del_hallazgo
    if (!grouped.has(codigo)) {
      grouped.set(codigo, {
        id: act.hallazgo_id ?? act.id,
        codigo,
        descripcion: act.descripcion ?? 'Plan de acción',
        estado: act.estado_plan_accion ?? 'Pendiente',
        actividades: [],
        completadas: 0,
        total: 0,
      })
    }
    const group = grouped.get(codigo)!
    group.actividades.push(act)
    group.total++
    const lower = act.estado_accion?.toLowerCase() ?? ''
    if (lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')) {
      group.completadas++
    }
  })
  return Array.from(grouped.values())
}

interface Props {
  hallazgo: HallazgoGroup
}

export function HallazgoChecklistCard({ hallazgo }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const progressPercent = hallazgo.total > 0 ? Math.round((hallazgo.completadas / hallazgo.total) * 100) : 0
  const progressColor = progressPercent === 100 ? '#22c55e' : progressPercent > 50 ? '#f59e0b' : '#ef4444'

  return (
    <Card className="overflow-hidden">
      <button type="button" className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <MiniRadialProgress value={progressPercent} size={48} strokeWidth={5} color={progressColor} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary font-semibold">{hallazgo.codigo}</span>
                <StatusBadge value={hallazgo.estado} />
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{hallazgo.descripcion}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Actividades</p>
              <p className="text-sm font-semibold">{hallazgo.completadas}/{hallazgo.total}</p>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
          </div>
        </div>
      </button>
      {isOpen && (
        <>
          <Separator />
          <CardContent className="p-4 space-y-2">
            {hallazgo.actividades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin actividades</p>
            ) : hallazgo.actividades.map((act, idx) => {
              const lower = act.estado_accion?.toLowerCase() ?? ''
              const isCompleted = lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
              const isOverdue = lower.includes('vencido') || lower.includes('atraso')
              return (
                <div key={act.id ?? idx} className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  isCompleted && 'bg-green-500/5 border-green-500/20',
                  isOverdue && 'bg-destructive/5 border-destructive/20',
                  !isCompleted && !isOverdue && 'bg-muted/30 border-border',
                )}>
                  <div className="pt-0.5">
                    {isCompleted
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium leading-tight', isCompleted && 'line-through text-muted-foreground')}>
                      {act.descripcion ?? 'Actividad sin descripción'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <StatusBadge value={act.estado_accion} />
                      {act.responsable_accion && <span className="text-[10px] text-muted-foreground">{act.responsable_accion}</span>}
                      {act.fecha_compromiso && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(act.fecha_compromiso)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </>
      )}
    </Card>
  )
}
