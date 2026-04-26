'use client'

import { RefreshCw, CheckCircle2, Circle, Calendar } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { isCompletada, type ActividadItem } from './types'

interface Props {
  actividad: ActividadItem
  onToggle: (id: number, completed: boolean) => void
  updating: boolean
}

export function ActividadRow({ actividad, onToggle, updating }: Props) {
  const done = isCompletada(actividad.estado_accion)

  const fechaLabel = actividad.fecha_compromiso
    ? (() => {
        const days = Math.round(
          (new Date(actividad.fecha_compromiso).getTime() - Date.now()) / 86_400_000
        )
        if (days < 0) return { text: `Vencida hace ${Math.abs(days)}d`, color: 'text-destructive' }
        if (days === 0) return { text: 'Vence hoy', color: 'text-amber-600' }
        if (days <= 7) return { text: `${days}d restantes`, color: 'text-amber-600' }
        return { text: `${days}d restantes`, color: 'text-muted-foreground' }
      })()
    : null

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border transition-all',
      done && 'bg-green-500/5 border-green-500/20',
      !done && 'bg-muted/20 border-border hover:bg-muted/40',
    )}>
      <button
        type="button"
        onClick={() => onToggle(actividad.id, !done)}
        disabled={updating}
        className={cn('mt-0.5 shrink-0 transition-opacity', updating && 'opacity-50 cursor-not-allowed')}
        aria-label={done ? 'Marcar pendiente' : 'Marcar completada'}
      >
        {updating ? (
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : done ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-snug', done && 'line-through text-muted-foreground')}>
          {actividad.descripcion ?? 'Sin descripción'}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {actividad.estado_accion && (
            <Badge variant="outline" className={cn('text-[10px]', done && 'border-green-500/30 text-green-600')}>
              {actividad.estado_accion}
            </Badge>
          )}
          {actividad.responsable_accion && (
            <span className="text-[10px] text-muted-foreground">{actividad.responsable_accion}</span>
          )}
          {fechaLabel && (
            <span className={cn('text-[10px] flex items-center gap-1', fechaLabel.color)}>
              <Calendar className="h-3 w-3" />
              {formatDateTime(actividad.fecha_compromiso!)}
              <span className="ml-1">({fechaLabel.text})</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
