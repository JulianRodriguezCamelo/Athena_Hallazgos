import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { EstadoBadge } from '@/components/shared/EstadoBadge'
import { WorkflowStepper } from './WorkflowStepper'
import { ChecklistItem } from './ChecklistItem'
import { SemaforoBadge } from './SemaforoBadge'
import { PRIORIDAD_CONFIG, type HallazgoWithActividades } from './types'

export function HallazgoCard({ hallazgo }: { hallazgo: HallazgoWithActividades }) {
  const progress = hallazgo.total > 0 ? Math.round((hallazgo.completadas / hallazgo.total) * 100) : 0

  return (
    <Dialog>
      <Card className="overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-start gap-1.5">
            <span className="font-mono text-xs font-bold text-primary">{hallazgo.codigo}</span>
            <Badge className={cn('text-[10px]', PRIORIDAD_CONFIG[hallazgo.prioridad].color)}>
              {PRIORIDAD_CONFIG[hallazgo.prioridad].label}
            </Badge>
            <SemaforoBadge dias={hallazgo.dias_restantes} />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-snug min-h-[2.5rem]" title={hallazgo.descripcion}>
            {hallazgo.descripcion}
          </p>
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
            <EstadoBadge estado={hallazgo.estado} />
            <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Ver detalle →</span>
          </div>
        </CardContent>
      </Card>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-primary">{hallazgo.codigo}</span>
            <Badge className={PRIORIDAD_CONFIG[hallazgo.prioridad].color}>{PRIORIDAD_CONFIG[hallazgo.prioridad].label}</Badge>
            <SemaforoBadge dias={hallazgo.dias_restantes} />
          </DialogTitle>
          <DialogDescription className="text-left">{hallazgo.descripcion}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
            <div className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2',
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
                {hallazgo.actividades.map((act, idx) => <ChecklistItem key={act.id ?? idx} actividad={act} />)}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
