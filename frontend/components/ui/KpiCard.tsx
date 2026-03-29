import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  variant?: 'default' | 'accent' | 'danger' | 'success' | 'warning'
  className?: string
}

const variantStyles = {
  default: {
    bar: 'bg-primary',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    value: 'text-primary',
  },
  accent: {
    bar: 'bg-accent',
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    value: 'text-accent',
  },
  danger: {
    bar: 'bg-destructive',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    value: 'text-destructive',
  },
  success: {
    bar: 'bg-[#16a34a]',
    iconBg: 'bg-[#16a34a]/10',
    iconColor: 'text-[#16a34a]',
    value: 'text-[#16a34a]',
  },
  warning: {
    bar: 'bg-[#d97706]',
    iconBg: 'bg-[#d97706]/10',
    iconColor: 'text-[#d97706]',
    value: 'text-[#d97706]',
  },
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  className,
}: KpiCardProps) {
  const s = variantStyles[variant]
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className={cn('h-1 w-full', s.bar)} />
      <CardContent className="flex items-center gap-4 pt-4">
        <div className={cn('p-2.5 rounded-lg shrink-0', s.iconBg)}>
          <Icon className={cn('w-5 h-5', s.iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </p>
          <p className={cn('text-3xl font-bold mt-0.5 leading-none', s.value)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
