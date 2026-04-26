'use client'

import { AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PrioridadBadge } from '@/components/atoms/PrioridadBadge'
import { SemaforoBadge } from '@/components/atoms/SemaforoBadge'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { WorkflowStepper } from '@/components/molecules/WorkflowStepper'
import type { HallazgoWithActividades } from '@/types'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  hallazgo: HallazgoWithActividades
}

export function HallazgoCard({ hallazgo }: Props) {
  const progress = hallazgo.total > 0 ? Math.round((hallazgo.completadas / hallazgo.total) * 100) : 0

  return (
    <Dialog>
      <DialogTrigger render={<Card className="overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group" />}>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-start gap-1.5">
              <span className="font-mono text-xs font-bold text-primary">{hallazgo.codigo}</span>
              <PrioridadBadge prioridad={hallazgo.prioridad} />
              <SemaforoBadge dias={hallazgo.dias_restantes} />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-snug min-h-[2.5rem]">{hallazgo.descripcion}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progreso</span>
                <span className={cn('font-bold tabular-nums',
                  progress === 100 ? 'text-green-500' : progress >= 50 ? 'text-amber-500' : 'text-destructive'
                )}>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-right">{hallazgo.completadas}/{hallazgo.total} actividades</p>
            </div>
            <div className="flex items-center justify-between">
              <StatusBadge value={hallazgo.estado} />
              <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Ver detalle →</span>
            </div>
          </CardContent>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-primary">{hallazgo.codigo}</span>
            <PrioridadBadge prioridad={hallazgo.prioridad} />
            <SemaforoBadge dias={hallazgo.dias_restantes} />
          </DialogTitle>
          <DialogDescription className="text-left">{hallazgo.descripcion}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
            <div className={cn('h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2',
              progress === 100 ? 'border-green-500 text-green-600' : progress >= 50 ? 'border-amber-500 text-amber-600' : 'border-destructive/60 text-destructive',
            )}>
              {progress}%
            </div>
            <div className="flex-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{hallazgo.completadas} de {hallazgo.total} actividades completadas</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium">Estado en el proceso</p>
            <WorkflowStepper currentEstado={hallazgo.workflow_estado} />
          </div>
          <Separator />
          <div>
            <p className="text-sm font-semibold mb-3">Actividades ({hallazgo.total})</p>
            {hallazgo.actividades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sin actividades registradas</p>
            ) : (
              <div className="space-y-2">
                {hallazgo.actividades.map((act, idx) => {
                  const lower = act.estado_accion?.toLowerCase() ?? ''
                  const isCompleted = lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
                  const isOverdue = lower.includes('vencido') || lower.includes('atraso')
                  return (
                    <div key={act.id ?? idx} className={cn('flex items-start gap-3 p-3 rounded-lg border',
                      isCompleted && 'bg-green-500/5 border-green-500/20',
                      isOverdue && 'bg-destructive/5 border-destructive/20',
                      !isCompleted && !isOverdue && 'bg-muted/30 border-border',
                    )}>
                      <div className="pt-0.5 shrink-0">
                        {isCompleted ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                          : isOverdue ? <AlertTriangle className="h-4 w-4 text-destructive" />
                          : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium leading-tight', isCompleted && 'line-through text-muted-foreground')}>
                          {act.descripcion ?? 'Sin descripción'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <StatusBadge value={act.estado_accion} />
                          {act.responsable_accion && <span className="text-[10px] text-muted-foreground">{act.responsable_accion}</span>}
                          {act.fecha_compromiso && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />{fmtDate(act.fecha_compromiso)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
