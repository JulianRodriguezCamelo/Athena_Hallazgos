import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, Cell, XAxis, YAxis, LabelList } from 'recharts'
import { EmptyChart } from '@/components/shared/EmptyChart'
import type { ChartItem } from '@/components/shared/EnhancedDonutCard'

const CHART_COLORS_HEX = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export function AccionesBarChart({ data }: { data: ChartItem[] }) {
  const config = data.reduce((acc, item, i) => {
    acc[item.name] = { label: item.name, color: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Estado de mis Acciones</CardTitle>
            <CardDescription className="text-xs">Distribución por estado de acción en mis hallazgos</CardDescription>
          </div>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={config} className="h-[180px] w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false}
                fontSize={10} stroke="var(--muted-foreground)"
                tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 14)}…` : v} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                {data.map((entry, i) => <Cell key={i} fill={entry.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />)}
                <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-semibold" />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
