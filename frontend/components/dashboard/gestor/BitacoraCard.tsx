import { History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { BitacoraEntry } from './types'

export function BitacoraCard({ entries }: { entries: BitacoraEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Bitácora</CardTitle>
            <CardDescription className="text-xs">Historial de cambios recientes</CardDescription>
          </div>
          <History className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Sin registros</p>
        ) : (
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="flex gap-3 text-xs">
                <div className="w-1 rounded-full bg-primary/30 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.accion}</p>
                  <p className="text-muted-foreground truncate">{e.detalle}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{e.usuario} · {e.fecha}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
