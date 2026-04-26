'use client'

import { useState } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ActividadRow } from './ActividadRow'
import { diasLabel, type HallazgoChecklist } from './types'

interface Props {
  hallazgo: HallazgoChecklist
  onToggleActividad: (actId: number, completed: boolean) => void
  updatingIds: Set<number>
}

export function HallazgoCard({ hallazgo, onToggleActividad, updatingIds }: Props) {
  const [open, setOpen] = useState(false)
  const dl = diasLabel(hallazgo.dias_restantes)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              'h-12 w-12 rounded-full flex flex-col items-center justify-center text-xs font-bold shrink-0 border-2',
              hallazgo.progreso === 100
                ? 'border-green-500 bg-green-500/10 text-green-600'
                : hallazgo.progreso >= 50
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                  : 'border-destructive/60 bg-destructive/5 text-destructive',
            )}>
              {hallazgo.progreso}%
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  {hallazgo.codigo_del_hallazgo}
                </span>
                <Badge variant="outline" className="text-[10px]">{hallazgo.estado}</Badge>
                {(hallazgo.dependencia_reporta_ero || hallazgo.vicepresidencia) && (
                  <span className="text-[10px] text-muted-foreground">
                    {hallazgo.dependencia_reporta_ero ?? hallazgo.vicepresidencia}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5 max-w-lg" title={hallazgo.descripcion}>
                {hallazgo.descripcion}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className={cn('hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', dl.bg, dl.color)}>
              <Clock className="h-3 w-3" />
              {dl.text}
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs text-muted-foreground">Actividades</p>
              <p className="text-sm font-bold">
                {hallazgo.actividades_completadas}/{hallazgo.total_actividades}
              </p>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
          </div>
        </div>

        <Progress value={hallazgo.progreso} className="mt-3 h-1.5" />

        <div className={cn('sm:hidden mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', dl.bg, dl.color)}>
          <Clock className="h-3 w-3" />
          {dl.text}
        </div>
      </button>

      {open && (
        <>
          <Separator />
          <CardContent className="p-4">
            {hallazgo.actividades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin actividades registradas</p>
            ) : (
              <div className="space-y-2">
                {hallazgo.actividades.map(act => (
                  <ActividadRow
                    key={act.id}
                    actividad={act}
                    onToggle={onToggleActividad}
                    updating={updatingIds.has(act.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  )
}
