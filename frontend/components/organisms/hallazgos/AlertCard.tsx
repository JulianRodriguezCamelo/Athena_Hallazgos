'use client'

import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PrioridadBadge } from '@/components/atoms/PrioridadBadge'
import { SemaforoBadge } from '@/components/atoms/SemaforoBadge'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { WorkflowStepper } from '@/components/molecules/WorkflowStepper'
import type { HallazgoRow, HallazgoWithActividades } from '@/types'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  hallazgo: HallazgoRow
  type: 'vencido' | 'proximo'
  detalle: HallazgoWithActividades | undefined
}

export function AlertCard({ hallazgo, type, detalle }: Props) {
  const isVencido = type === 'vencido'
  const progress = detalle && detalle.total > 0 ? Math.round((detalle.completadas / detalle.total) * 100) : 0

  return (
    <Dialog>
      <DialogTrigger render={<Card className={cn('overflow-hidden cursor-pointer transition-all hover:shadow-md group',
        isVencido
          ? 'border-destructive/30 bg-destructive/5 hover:border-destructive/50'
          : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50',
      )} />}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isVencido
                  ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  : <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                <span className="font-mono text-xs font-bold text-primary truncate">{hallazgo.codigo_del_hallazgo ?? '—'}</span>
              </div>
              <PrioridadBadge prioridad={hallazgo.prioridad} />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug min-h-[2rem]">{hallazgo.descripcion ?? '—'}</p>
            <div className="flex items-center justify-between">
              {isVencido
                ? <Badge variant="destructive" className="text-[10px]">Vencido {Math.abs(hallazgo.dias_restantes)}d</Badge>
                : <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">{hallazgo.dias_restantes}d restantes</Badge>}
              <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Ver detalle →</span>
            </div>
          </CardContent>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-primary">{hallazgo.codigo_del_hallazgo ?? '—'}</span>
            <PrioridadBadge prioridad={hallazgo.prioridad} />
            <SemaforoBadge dias={hallazgo.dias_restantes} />
          </DialogTitle>
          <DialogDescription className="text-left">{hallazgo.descripcion ?? '—'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {detalle && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
              <div className={cn('h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2',
                progress === 100 ? 'border-green-500 text-green-600' : progress >= 50 ? 'border-amber-500 text-amber-600' : 'border-destructive/60 text-destructive',
              )}>
                {progress}%
              </div>
              <div className="flex-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{detalle.completadas} de {detalle.total} actividades completadas</p>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Estado en el proceso</p>
            <WorkflowStepper currentEstado={hallazgo.workflow_estado} />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-0.5"><p className="text-muted-foreground">Estado</p><StatusBadge value={hallazgo.estado} /></div>
            <div className="space-y-0.5"><p className="text-muted-foreground">Responsable</p><p className="font-medium">{hallazgo.responsable_plan_accion ?? '—'}</p></div>
            <div className="space-y-0.5"><p className="text-muted-foreground">Fecha cierre proyectada</p><p className="font-medium">{fmtDate(hallazgo.fecha_cierre_proyectada)}</p></div>
            <div className="space-y-0.5"><p className="text-muted-foreground">Dependencia</p><p className="font-medium">{hallazgo.dependencia_reporta_ero ?? '—'}</p></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
