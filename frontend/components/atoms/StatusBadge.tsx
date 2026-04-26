import { cn, getEstadoColor } from '@/lib/utils'

interface Props {
  value: string | null | undefined
  className?: string
}

export function StatusBadge({ value, className }: Props) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', getEstadoColor(value), className)}>
      {value}
    </span>
  )
}
