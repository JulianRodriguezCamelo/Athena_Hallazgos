import { cn } from '@/lib/utils'

interface Props {
  active: boolean
  label: string
  onClick: () => void
  className?: string
}

export function FilterPill({ active, label, onClick, className }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
        className,
      )}
    >
      {label}
    </button>
  )
}
