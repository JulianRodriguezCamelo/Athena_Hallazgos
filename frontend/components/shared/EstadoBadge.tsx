import { Badge } from '@/components/ui/Badge'

export function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado) return <Badge variant="outline">—</Badge>
  const lower = estado.toLowerCase()
  if (lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido'))
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{estado}</Badge>
  if (lower.includes('vencido') || lower.includes('atraso'))
    return <Badge variant="destructive">{estado}</Badge>
  if (lower.includes('validac'))
    return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">{estado}</Badge>
  return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{estado}</Badge>
}
