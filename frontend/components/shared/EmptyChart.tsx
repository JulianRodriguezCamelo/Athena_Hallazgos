import { BarChart3 } from 'lucide-react'

export function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
      <BarChart3 className="h-7 w-7 mb-2 opacity-30" />
      <p className="text-xs">Sin datos</p>
    </div>
  )
}
