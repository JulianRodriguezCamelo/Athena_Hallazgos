interface Props {
  label: string
  value: number
  max: number
}

export function BarRow({ label, value, max }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-32 truncate text-muted-foreground shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 min-w-0">
        <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-semibold text-foreground shrink-0">{value}</span>
    </div>
  )
}
