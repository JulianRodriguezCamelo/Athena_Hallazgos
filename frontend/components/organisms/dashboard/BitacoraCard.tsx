import { History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import type { BitacoraEntry } from '@/types'

interface Props {
  entries: BitacoraEntry[]
}

export function BitacoraCard({ entries }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Bitácora de Actividad</CardTitle>
            <CardDescription className="text-xs">Últimas acciones registradas</CardDescription>
          </div>
          <History className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs">Sin actividad reciente registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex gap-3 text-xs">
                <div className="shrink-0 w-1 rounded-full bg-primary/20" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{entry.usuario}</span>
                    <span className="text-muted-foreground">{formatDateTime(entry.fecha)}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{entry.accion}</p>
                  {entry.detalle && <p className="text-foreground/70 mt-0.5 truncate">{entry.detalle}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
