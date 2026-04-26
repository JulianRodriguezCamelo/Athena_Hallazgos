import { FileWarning, Calendar, ArrowUpRight } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import type { HallazgoRow } from '@/types'

interface Props {
  hallazgo: HallazgoRow
}

export function PendingHallazgoItem({ hallazgo }: Props) {
  const isOverdue = hallazgo.estado?.toLowerCase().includes('vencido')
  const hasProrroga = hallazgo.prorroga === 'Si'

  return (
    <div className={cn(
      'group flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer',
      isOverdue
        ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10'
        : 'bg-muted/30 border-border hover:bg-muted/50',
    )}>
      <div className={cn(
        'shrink-0 h-10 w-10 rounded-lg flex items-center justify-center',
        isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
      )}>
        <FileWarning className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-primary font-semibold">{hallazgo.codigo_del_hallazgo}</span>
          {hasProrroga && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Prórroga</Badge>}
        </div>
        <p className="text-sm text-foreground/80 truncate mt-0.5" title={hallazgo.descripcion ?? undefined}>
          {hallazgo.descripcion}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <StatusBadge value={hallazgo.estado} />
          {hallazgo.fecha_cierre_proyectada && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateTime(hallazgo.fecha_cierre_proyectada)}
            </span>
          )}
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}
