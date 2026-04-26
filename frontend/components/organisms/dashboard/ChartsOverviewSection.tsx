import { DonutChartCard } from '@/components/molecules/DonutChartCard'
import type { ChartItem } from '@/types'

interface Props {
  porEstado: ChartItem[]
  porEstadoPlan: ChartItem[]
  porSemaforo?: ChartItem[]
  total: number
  cumplimiento?: number
}

export function ChartsOverviewSection({ porEstado, porEstadoPlan, porSemaforo, total, cumplimiento }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {porSemaforo && (
        <DonutChartCard
          title="Semáforo de Vencimiento"
          description="Distribución por urgencia"
          data={porSemaforo}
          centerLabel={String(total)}
          centerSubLabel="hallazgos"
        />
      )}
      <DonutChartCard
        title="Por Estado"
        description="Distribución de hallazgos por estado actual"
        data={porEstado}
        centerLabel={String(total)}
        centerSubLabel="total"
      />
      <DonutChartCard
        title="Plan de Acción"
        description="Estado de los planes de acción"
        data={porEstadoPlan}
        centerLabel={cumplimiento !== undefined ? `${cumplimiento}%` : String(porEstadoPlan.length)}
        centerSubLabel={cumplimiento !== undefined ? 'cumplim.' : 'estados'}
      />
    </div>
  )
}
