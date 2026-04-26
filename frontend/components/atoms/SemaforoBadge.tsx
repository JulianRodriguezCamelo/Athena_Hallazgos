import { Badge } from '@/components/ui/badge'

interface Props {
  dias: number
}

export function SemaforoBadge({ dias }: Props) {
  if (dias < 0)
    return (
      <Badge variant="destructive" className="gap-1 text-[10px]">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        Vencido
      </Badge>
    )
  if (dias <= 7)
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px]">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Próximo
      </Badge>
    )
  return (
    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-[10px]">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      En tiempo
    </Badge>
  )
}
