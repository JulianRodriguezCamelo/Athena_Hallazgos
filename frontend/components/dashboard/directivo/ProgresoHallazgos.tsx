import { CheckCircle2 } from 'lucide-react'
import { Pagination } from '@/components/shared/Pagination'
import { HallazgoChecklistCard } from './HallazgoChecklistCard'
import type { HallazgoWithActividades } from './types'

interface ProgresoHallazgosProps {
  grupos: HallazgoWithActividades[]
  aPage: number
  aPages: number
  onPageChange: (p: number) => void
}

export function ProgresoHallazgos({ grupos, aPage, aPages, onPageChange }: ProgresoHallazgosProps) {
  if (grupos.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Progreso por Hallazgo</h3>
          <p className="text-xs text-muted-foreground">Actividades asignadas agrupadas por hallazgo</p>
        </div>
      </div>
      <div className="space-y-3">
        {grupos.map((h) => <HallazgoChecklistCard key={h.id} hallazgo={h} />)}
      </div>
      {aPages > 1 && (
        <div className="mt-3">
          <Pagination page={aPage} pages={aPages} onChange={onPageChange} />
        </div>
      )}
    </div>
  )
}
