import { cn } from '@/lib/utils'
import { KpiCard } from '@/components/atoms/KpiCard'
import type { LucideIcon } from 'lucide-react'

export interface KpiItem {
  title: string
  value: number | string
  icon: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  trend?: number
  subtitle?: string
}

interface Props {
  items: KpiItem[]
  columns?: 2 | 3 | 4 | 5 | 6
  className?: string
}

const colClass: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

export function KpiRow({ items, columns = 4, className }: Props) {
  return (
    <div className={cn('grid gap-4', colClass[columns] ?? colClass[4], className)}>
      {items.map((item) => (
        <KpiCard key={item.title} {...item} />
      ))}
    </div>
  )
}
