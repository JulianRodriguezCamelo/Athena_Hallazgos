import { CheckCircle2, AlertTriangle, Circle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import type { ActividadRow } from '@/types'

interface Props {
  actividad: ActividadRow
  className?: string
}

function fmtDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ChecklistItem({ actividad, className }: Props) {
  const lower = actividad.estado_accion?.toLowerCase() ?? ''
  const isCompleted = lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
  const isOverdue = lower.includes('vencido') || lower.includes('atraso')

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border',
      isCompleted && 'bg-green-500/5 border-green-500/20',
      isOverdue && 'bg-destructive/5 border-destructive/20',
      !isCompleted && !isOverdue && 'bg-muted/30 border-border',
      className,
    )}>
      <div className="pt-0.5 shrink-0">
        {isCompleted
          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
          : isOverdue
            ? <AlertTriangle className="h-4 w-4 text-destructive" />
            : <Circle className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-tight', isCompleted && 'line-through text-muted-foreground')}>
          {actividad.descripcion ?? 'Sin descripción'}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <StatusBadge value={actividad.estado_accion} />
          {actividad.responsable_accion && (
            <span className="text-[10px] text-muted-foreground">{actividad.responsable_accion}</span>
          )}
          {actividad.fecha_compromiso && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {fmtDate(actividad.fecha_compromiso)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
