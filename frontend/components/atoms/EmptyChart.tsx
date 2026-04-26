import { BarChart3 } from 'lucide-react'

interface Props {
  height?: number
  message?: string
}

export function EmptyChart({ height = 180, message = 'Sin datos' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground" style={{ height }}>
      <BarChart3 className="h-7 w-7 mb-2 opacity-30" />
      <p className="text-xs">{message}</p>
    </div>
  )
}
