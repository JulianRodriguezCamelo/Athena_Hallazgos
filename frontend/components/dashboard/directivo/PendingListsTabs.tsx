'use client'

import { useState } from 'react'
import { FileWarning, Calendar, ArrowUpRight, CheckCircle2, ListTodo, ClipboardList } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EstadoBadge } from '@/components/shared/EstadoBadge'
import type { HallazgoRow, ActividadRow } from './types'

function PendingHallazgoItem({ hallazgo }: { hallazgo: HallazgoRow }) {
  const isOverdue = hallazgo.estado?.toLowerCase().includes('vencido')
  const hasProrroga = hallazgo.prorroga === 'Si'
  return (
    <div className={cn(
      'group flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer',
      isOverdue ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10' : 'bg-muted/30 border-border hover:bg-muted/50',
    )}>
      <div className={cn(
        'shrink-0 h-10 w-10 rounded-lg flex items-center justify-center',
        isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
      )}>
        <FileWarning className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-primary font-semibold">{hallazgo.codigo_del_hallazgo}</span>
          {hasProrroga && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Prórroga</Badge>}
        </div>
        <p className="text-sm text-foreground/80 truncate mt-0.5" title={hallazgo.descripcion ?? undefined}>
          {hallazgo.descripcion}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <EstadoBadge estado={hallazgo.estado} />
          {hallazgo.fecha_cierre_proyectada && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />{formatDateTime(hallazgo.fecha_cierre_proyectada)}
            </span>
          )}
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

function PendingActivityItem({ actividad }: { actividad: ActividadRow }) {
  const lower = actividad.estado_accion?.toLowerCase() ?? ''
  const isCompleted = lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
  const isOverdue = lower.includes('vencido') || lower.includes('atraso')
  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-xl border transition-all',
      isCompleted && 'bg-green-500/5 border-green-500/20',
      isOverdue && 'bg-destructive/5 border-destructive/20',
      !isCompleted && !isOverdue && 'bg-muted/30 border-border hover:bg-muted/50',
    )}>
      <div className="pt-0.5 shrink-0">
        {isCompleted
          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
          : isOverdue
            ? <FileWarning className="h-5 w-5 text-destructive" />
            : <ListTodo className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] text-primary/70">{actividad.codigo_del_hallazgo}</span>
        </div>
        <p className={cn('text-sm font-medium leading-tight', isCompleted && 'line-through text-muted-foreground')}>
          {actividad.descripcion ?? 'Actividad sin descripción'}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <EstadoBadge estado={actividad.estado_accion} />
          {actividad.responsable_accion && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{actividad.responsable_accion}</span>
          )}
          {actividad.fecha_compromiso && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />{formatDateTime(actividad.fecha_compromiso)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface PendingListsTabsProps {
  hallazgos: HallazgoRow[]
  actividades: ActividadRow[]
}

export function PendingListsTabs({ hallazgos, actividades }: PendingListsTabsProps) {
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
              <FileWarning className="h-4 w-4 text-amber-500" />Hallazgos Pendientes de Cierre
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
              <ListTodo className="h-4 w-4 text-primary" />Actividades Pendientes
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
