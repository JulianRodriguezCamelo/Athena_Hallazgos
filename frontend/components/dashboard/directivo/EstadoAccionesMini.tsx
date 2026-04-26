import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { EmptyChart } from '@/components/shared/EmptyChart'
import type { ChartItem } from '@/components/shared/EnhancedDonutCard'

const CHART_COLORS_HEX = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export function EstadoAccionesMini({ data }: { data: ChartItem[] }) {
  const totalAcciones = data.reduce((acc, d) => acc + d.value, 0)
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Estado de Acciones</CardTitle>
        <CardDescription className="text-xs">Distribución de mis actividades</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <div className="space-y-3">
            {data.map((item, i) => {
              const percent = Math.round((item.value / totalAcciones) * 100)
              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <Progress
                    value={percent}
                    className="h-1.5"
                    style={{ '--progress-background': CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] } as React.CSSProperties}
                  />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
