import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
import { EmptyChart } from '@/components/atoms/EmptyChart'
import { CHART_COLORS_HEX } from '@/types'

interface Props {
  data: { name: string; value: number; fill?: string }[]
}

export function EstadoAccionesCard({ data }: Props) {
  const totalAcciones = data.reduce((acc, d) => acc + d.value, 0)
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
            <CardDescription className="text-xs">Distribución por estado de acción</CardDescription>
          </div>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <>
            <div className="space-y-2 mb-4">
              {data.map((item, i) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <Progress value={totalAcciones > 0 ? Math.round((item.value / totalAcciones) * 100) : 0} className="h-1.5" />
                </div>
              ))}
            </div>
            <ChartContainer config={config} className="h-[140px] w-full">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false}
                  fontSize={10} stroke="var(--muted-foreground)"
                  tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 14)}…` : v} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                  {data.map((entry, i) => <Cell key={i} fill={entry.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />)}
                  <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-semibold" />
                </Bar>
              </BarChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
