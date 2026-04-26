import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiTileProps {
  title?: string
  label?: string
  value: number | string
  icon?: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  trend?: number
  subtitle?: string
  sub?: string
}

const variantStyles: Record<string, string> = {
  default: 'bg-card border-border/50',
  success: 'bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20',
  warning: 'bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20',
  danger: 'bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20',
  info: 'bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20',
}

const iconStyles: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-green-500/10 text-green-500',
  warning: 'bg-amber-500/10 text-amber-500',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-500/10 text-blue-500',
}

const valueColors: Record<string, string> = {
  default: 'text-foreground',
  success: 'text-green-600',
  warning: 'text-amber-600',
  danger: 'text-destructive',
  info: 'text-blue-600',
}

export function KpiTile({ title, label, value, icon: Icon, variant = 'default', trend, subtitle, sub }: KpiTileProps) {
  const heading = title ?? label ?? ''
  const desc = subtitle ?? sub

  return (
    <Card className={cn('overflow-hidden transition-all hover:shadow-md', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{heading}</p>
            <div className="flex items-baseline gap-2">
              <p className={cn('text-2xl font-bold tracking-tight', valueColors[variant])}>{value}</p>
              {trend !== undefined && (
                <span className={cn('flex items-center text-xs font-semibold', trend > 0 ? 'text-green-500' : 'text-destructive')}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
          </div>
          {Icon && (
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', iconStyles[variant])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
