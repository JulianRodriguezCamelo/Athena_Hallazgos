'use client'

import { useState } from 'react'
import { ClipboardList, ListTodo, FileWarning, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PendingHallazgoItem } from '@/components/molecules/PendingHallazgoItem'
import { PendingActivityItem } from '@/components/molecules/PendingActivityItem'
import type { HallazgoRow, ActividadRow } from '@/types'

interface Props {
  hallazgos: HallazgoRow[]
  actividades: ActividadRow[]
}

export function PendingListsTabs({ hallazgos, actividades }: Props) {
  const [tab, setTab] = useState<'hallazgos' | 'actividades'>('hallazgos')

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'hallazgos' | 'actividades')} className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="hallazgos" className="gap-2">
          <ClipboardList className="h-4 w-4" />
          Hallazgos Pendientes
          <Badge variant="secondary" className="ml-1">{hallazgos.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="actividades" className="gap-2">
          <ListTodo className="h-4 w-4" />
          Actividades Pendientes
          <Badge variant="secondary" className="ml-1">{actividades.length}</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hallazgos" className="mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-amber-500" />
              Hallazgos Pendientes de Cierre
            </CardTitle>
            <CardDescription>Hallazgos asignados que requieren acción</CardDescription>
          </CardHeader>
          <CardContent>
            {hallazgos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-green-500/50" />
                <p className="text-sm font-medium">¡Excelente!</p>
                <p className="text-xs">No tienes hallazgos pendientes</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {hallazgos.map((h) => <PendingHallazgoItem key={h.id} hallazgo={h} />)}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="actividades" className="mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-primary" />
              Actividades Pendientes
            </CardTitle>
            <CardDescription>Acciones que debes completar</CardDescription>
          </CardHeader>
          <CardContent>
            {actividades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-green-500/50" />
                <p className="text-sm font-medium">¡Todo al día!</p>
                <p className="text-xs">No tienes actividades pendientes</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {actividades.map((a) => <PendingActivityItem key={a.id} actividad={a} />)}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
