import { cn } from '@/lib/utils'
import type { WorkflowEstado } from '@/types'

interface Props {
  estado: WorkflowEstado
  label: string
  isCurrent: boolean
  isPast: boolean
}

export function WorkflowStep({ label, isCurrent, isPast }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
        isCurrent && 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30',
        isPast && 'border-green-500 bg-green-500 text-white',
        !isCurrent && !isPast && 'border-muted-foreground/30 text-muted-foreground/40',
      )}>
        {isPast ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="w-2 h-2 rounded-full bg-current" />
        )}
      </div>
      <span className={cn(
        'text-[9px] font-medium text-center leading-tight max-w-[48px]',
        isCurrent && 'text-primary',
        isPast && 'text-green-600',
        !isCurrent && !isPast && 'text-muted-foreground/50',
      )}>
        {label}
      </span>
    </div>
  )
}
