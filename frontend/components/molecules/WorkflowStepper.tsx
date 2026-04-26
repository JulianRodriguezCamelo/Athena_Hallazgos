import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Search, Play, Shield, type LucideIcon } from 'lucide-react'
import { WORKFLOW_STEPS, type WorkflowEstado } from '@/types'

const STEP_ICONS: Record<WorkflowEstado, LucideIcon> = {
  abierto: Circle,
  en_analisis: Search,
  en_ejecucion: Play,
  en_validacion: Shield,
  cerrado: CheckCircle2,
}

interface Props {
  currentEstado: WorkflowEstado
}

export function WorkflowStepper({ currentEstado }: Props) {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.estado === currentEstado)

  return (
    <div className="flex items-start justify-between w-full gap-1">
      {WORKFLOW_STEPS.map((step, index) => {
        const Icon = STEP_ICONS[step.estado]
        const isCurrent = index === currentIndex
        const isPast = index < currentIndex

        return (
          <div key={step.estado} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 flex-none">
              <div className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center transition-all border-2',
                isCurrent && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 ring-offset-2 ring-offset-background shadow-md shadow-primary/20',
                isPast && 'bg-green-500/10 border-green-500/50 text-green-500',
                !isCurrent && !isPast && 'bg-muted/20 border-border/40 text-muted-foreground/30',
              )}>
                {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn('text-[10px] font-medium text-center leading-tight max-w-[60px]',
                isCurrent && 'text-primary font-semibold',
                isPast && 'text-green-500',
                !isCurrent && !isPast && 'text-muted-foreground/40',
              )}>
                {step.label}
              </span>
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-1 mb-5 rounded-full', isPast ? 'bg-green-500/40' : 'bg-muted/25')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
