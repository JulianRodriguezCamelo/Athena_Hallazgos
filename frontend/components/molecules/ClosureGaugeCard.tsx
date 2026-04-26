import { Target, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { RadialBar, RadialBarChart } from 'recharts'

interface Props {
  cumplimiento: number
  cerradas: number
  total: number
  description?: string
}

export function ClosureGaugeCard({ cumplimiento, cerradas, total, description = 'Hallazgos cerrados vs total' }: Props) {
  const color = cumplimiento >= 70 ? '#22c55e' : cumplimiento >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Índice de Cierre</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <Target className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ChartContainer config={{ value: { label: 'Cierre' } }} className="mx-auto aspect-square h-[180px]">
            <RadialBarChart
              data={[{ name: 'Cumplimiento', value: cumplimiento, fill: color }]}
              startAngle={90} endAngle={90 - cumplimiento * 3.6}
              innerRadius={60} outerRadius={85} cx="50%" cy="50%"
            >
              <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'hsl(var(--muted))' }} />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              'text-4xl font-bold',
              cumplimiento >= 70 && 'text-green-500',
              cumplimiento >= 40 && cumplimiento < 70 && 'text-amber-500',
              cumplimiento < 40 && 'text-destructive',
            )}>
              {cumplimiento}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">{cerradas} de {total}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          {cumplimiento >= 70
            ? <><TrendingUp className="h-4 w-4 text-green-500" /><span className="text-xs text-green-600 font-medium">Buen desempeño</span></>
            : <><TrendingDown className="h-4 w-4 text-amber-500" /><span className="text-xs text-amber-600 font-medium">Requiere atención</span></>
          }
        </div>
      </CardContent>
    </Card>
  )
}
