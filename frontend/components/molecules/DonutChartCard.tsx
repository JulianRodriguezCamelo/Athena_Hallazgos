import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell } from 'recharts'
import { EmptyChart } from '@/components/atoms/EmptyChart'
import { CHART_COLORS_HEX, type ChartItem } from '@/types'

interface Props {
  title: string
  description: string
  data: ChartItem[]
  centerLabel: string
  centerSubLabel: string
  innerRadius?: number
  outerRadius?: number
}

export function DonutChartCard({
  title, description, data, centerLabel, centerSubLabel,
  innerRadius = 50, outerRadius = 75,
}: Props) {
  if (!data.length) return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent><EmptyChart /></CardContent>
    </Card>
  )

  const total = data.reduce((acc, d) => acc + d.value, 0)
  const config = data.reduce((acc, item, i) => {
    acc[item.name] = { label: item.name, color: item.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ChartContainer config={config} className="mx-auto aspect-square h-[160px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={data.map((d, i) => ({ ...d, fill: d.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }))}
                dataKey="value" nameKey="name"
                innerRadius={innerRadius} outerRadius={outerRadius}
                paddingAngle={2} strokeWidth={0}
              >
                {data.map((d, i) => <Cell key={i} fill={d.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{centerLabel}</span>
            <span className="text-[10px] text-muted-foreground">{centerSubLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-medium">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
