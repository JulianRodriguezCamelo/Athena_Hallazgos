'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface DataItem { name: string; value: number }

interface LineChartProps {
  data: DataItem[]
  height?: number
  color?: string
}

const chartConfig = {
  value: { label: 'Total', color: 'var(--chart-2)' },
} satisfies ChartConfig

export default function LineChart({ data, height = 260, color }: LineChartProps) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Sin datos
      </div>
    )
  }

  const stroke = color ?? 'var(--chart-2)'

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={stroke} stopOpacity={0.3} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2.5}
          fill="url(#areaGrad)"
          dot={{ fill: stroke, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: stroke, strokeWidth: 2, fill: 'var(--background)' }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
