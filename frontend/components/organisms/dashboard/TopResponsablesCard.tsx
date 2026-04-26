import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import type { ChartItem } from '@/types'

interface Props {
  responsables: ChartItem[]
}

export function TopResponsablesCard({ responsables }: Props) {
  const maxResp = Math.max(...responsables.map((r) => r.value), 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Top Responsables</CardTitle>
            <CardDescription className="text-xs">Por cantidad de hallazgos asignados</CardDescription>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {responsables.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
        ) : (
          responsables.slice(0, 5).map((item, index) => {
            const initials = item.name.split(' ').slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('')
            return (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 text-right">{index + 1}</span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <Progress value={(item.value / maxResp) * 100} className="h-1.5 mt-1" />
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">{item.value}</Badge>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
