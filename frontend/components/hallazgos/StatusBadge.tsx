import { cn, getEstadoColor } from '@/lib/utils'

export function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', getEstadoColor(value))}>
      {value}
    </span>
  )
}
