import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { RetrasadoRow } from './types'

export function TopRetrasadosCard({ data }: { data: RetrasadoRow[] }) {
  const maxDias = Math.max(...data.map(d => d.dias_retraso), 1)
  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Top Hallazgos Retrasados</CardTitle>
            <CardDescription className="text-xs">Días de retraso · actividades pendientes para cerrar</CardDescription>
          </div>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[120px] gap-2 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 opacity-20" />
            <p className="text-xs">Sin hallazgos retrasados. ¡Buen trabajo!</p>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {data.map((row) => {
              const pct = Math.max(Math.round((row.dias_retraso / maxDias) * 100), 4)
              const color = row.dias_retraso > 365 ? '#ef4444' : row.dias_retraso > 90 ? '#f97316' : '#f59e0b'
              return (
                <div key={row.codigo} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold text-primary shrink-0">{row.codigo}</span>
                      <span className="truncate text-muted-foreground">{row.descripcion}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold tabular-nums" style={{ color }}>{row.dias_retraso}d</span>
                      <span className="text-muted-foreground tabular-nums whitespace-nowrap">{row.actividades_pendientes} act. pend.</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
