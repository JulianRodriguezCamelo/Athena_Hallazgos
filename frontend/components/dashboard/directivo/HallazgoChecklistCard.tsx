'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { EstadoBadge } from '@/components/shared/EstadoBadge'
import { MiniRadialProgress } from './MiniRadialProgress'
import { ChecklistItem } from './ChecklistItem'
import type { HallazgoWithActividades } from './types'

export function HallazgoChecklistCard({ hallazgo }: { hallazgo: HallazgoWithActividades }) {
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
                <EstadoBadge estado={hallazgo.estado} />
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5" title={hallazgo.descripcion}>
                {hallazgo.descripcion}
              </p>
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
          <CardContent className="p-4">
            {hallazgo.actividades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin actividades registradas</p>
            ) : (
              <div className="space-y-2">
                {hallazgo.actividades.map((actividad, idx) => (
                  <ChecklistItem key={actividad.id ?? idx} actividad={actividad} />
                ))}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  )
}
