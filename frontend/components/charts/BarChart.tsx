'use client'

import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface DataItem { name: string; value: number }

interface BarChartProps {
  data: DataItem[]
  height?: number
  horizontal?: boolean
  showValues?: boolean
  showLegend?: boolean
}

const chartConfig = {
  value: { label: 'Total', color: 'var(--chart-1)' },
} satisfies ChartConfig

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export default function BarChart({
  data,
  height = 280,
  horizontal = false,
  showValues = false,
  showLegend = false,
}: BarChartProps) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Sin datos
      </div>
    )
  }

  if (horizontal) {
    return (
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <RechartsBar data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
          <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v?.length > 20 ? v.slice(0, 19) + '…' : v}
          />
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'var(--muted)' }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
            {showValues && (
              <LabelList
                dataKey="value"
                position="right"
                style={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }}
              />
            )}
          </Bar>
        </RechartsBar>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <RechartsBar data={data} margin={{ top: showValues ? 20 : 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v?.length > 12 ? v.slice(0, 11) + '…' : v}
        />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'var(--muted)' }} />
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
          {showValues && (
            <LabelList
              dataKey="value"
              position="top"
              style={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }}
            />
          )}
        </Bar>
      </RechartsBar>
    </ChartContainer>
  )
}
