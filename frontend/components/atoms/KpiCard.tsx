import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface Props {
  title: string
  value: number | string
  icon: LucideIcon
  variant?: Variant
  trend?: number
  subtitle?: string
  className?: string
}

const cardStyles: Record<Variant, string> = {
  default: 'bg-card',
  success: 'bg-green-500/5 border-green-500/20',
  warning: 'bg-amber-500/5 border-amber-500/20',
  danger: 'bg-destructive/5 border-destructive/20',
  info: 'bg-blue-500/5 border-blue-500/20',
}

const iconBgStyles: Record<Variant, string> = {
  default: 'bg-muted/50 text-muted-foreground',
  success: 'bg-green-500/10 text-green-500',
  warning: 'bg-amber-500/10 text-amber-500',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-500/10 text-blue-500',
}

export function KpiCard({ title, value, icon: Icon, variant = 'default', trend, subtitle, className }: Props) {
  return (
    <Card className={cn('overflow-hidden', cardStyles[variant], className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend !== undefined && (
                <span className={cn('flex items-center text-xs font-semibold', trend > 0 ? 'text-green-500' : 'text-destructive')}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', iconBgStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
