import { CheckCircle2, AlertTriangle, Circle, Calendar } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import type { ActividadRow } from '@/types'

interface Props {
  actividad: ActividadRow
}

export function PendingActivityItem({ actividad }: Props) {
  const lower = actividad.estado_accion?.toLowerCase() ?? ''
  const isCompleted = lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
  const isOverdue = lower.includes('vencido') || lower.includes('atraso')

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-xl border transition-all',
      isCompleted && 'bg-green-500/5 border-green-500/20',
      isOverdue && 'bg-destructive/5 border-destructive/20',
      !isCompleted && !isOverdue && 'bg-muted/30 border-border hover:bg-muted/50',
    )}>
      <div className="pt-0.5 shrink-0">
        {isCompleted
          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
          : isOverdue
            ? <AlertTriangle className="h-5 w-5 text-destructive" />
            : <Circle className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] text-primary/70">{actividad.codigo_del_hallazgo}</span>
        </div>
        <p className={cn('text-sm font-medium leading-tight', isCompleted && 'line-through text-muted-foreground')}>
          {actividad.descripcion ?? 'Actividad sin descripción'}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <StatusBadge value={actividad.estado_accion} />
          {actividad.responsable_accion && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {actividad.responsable_accion}
            </span>
          )}
          {actividad.fecha_compromiso && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateTime(actividad.fecha_compromiso)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
