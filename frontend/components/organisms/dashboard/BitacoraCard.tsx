'use client'

import { useState } from 'react'
import { History, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import type { BitacoraEntry } from '@/types'

const INITIAL_SHOW = 5

interface Props {
  entries: BitacoraEntry[]
}

export function BitacoraCard({ entries }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? entries : entries.slice(0, INITIAL_SHOW)

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
          <>
            <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: expanded ? '480px' : 'none' }}>
              {visible.map((entry) => (
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
            {entries.length > INITIAL_SHOW && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <><ChevronUp className="h-3.5 w-3.5" />Ver menos</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5" />Ver {entries.length - INITIAL_SHOW} entradas más</>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
