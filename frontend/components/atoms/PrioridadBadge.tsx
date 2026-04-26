import { cn } from '@/lib/utils'
import { PRIORIDAD_CONFIG, type Prioridad } from '@/types'

interface Props {
  prioridad: Prioridad
  className?: string
}

export function PrioridadBadge({ prioridad, className }: Props) {
  const config = PRIORIDAD_CONFIG[prioridad]
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
      config.color,
      className,
    )}>
      {config.label}
    </span>
  )
}
