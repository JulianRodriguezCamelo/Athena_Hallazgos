import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

const trendData = [
  { month: 'Ene', cerrados: 4, abiertos: 8 },
  { month: 'Feb', cerrados: 6, abiertos: 7 },
  { month: 'Mar', cerrados: 5, abiertos: 9 },
  { month: 'Abr', cerrados: 8, abiertos: 6 },
  { month: 'May', cerrados: 7, abiertos: 5 },
  { month: 'Jun', cerrados: 9, abiertos: 4 },
]

export function TrendChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Tendencia de Cierre</CardTitle>
        <CardDescription className="text-xs">Evolución de hallazgos en los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ cerrados: { label: 'Cerrados', color: '#22c55e' }, abiertos: { label: 'Abiertos', color: '#f59e0b' } }}
          className="h-[200px] w-full"
        >
          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCerrados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAbiertos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="cerrados" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorCerrados)" />
            <Area type="monotone" dataKey="abiertos" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorAbiertos)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
