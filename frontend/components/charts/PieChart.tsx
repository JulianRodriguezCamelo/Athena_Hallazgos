'use client'

import { PieChart as RechartsPie, Pie, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

const PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#16a34a',
  '#d97706',
]

interface DataItem { name: string; value: number }

interface PieChartProps {
  data: DataItem[]
  height?: number
  donut?: boolean
}

// Percentage label rendered inside each slice
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (props: any) => {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function PieChart({ data, height = 300, donut = true }: PieChartProps) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Sin datos
      </div>
    )
  }

  const config = data.reduce<ChartConfig>((acc, item, i) => {
    acc[item.name] = { label: item.name, color: PALETTE[i % PALETTE.length] }
    return acc
  }, {})

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="44%"
          innerRadius={donut ? 52 : 0}
          outerRadius={90}
          dataKey="value"
          nameKey="name"
          labelLine={false}
          label={renderLabel}
          strokeWidth={2}
          stroke="var(--background)"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          wrapperStyle={{ paddingTop: 10, fontSize: 11 }}
        />
      </RechartsPie>
    </ChartContainer>
  )
}
