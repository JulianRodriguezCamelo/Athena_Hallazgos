'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { Pagination } from '@/components/molecules/Pagination'
import { formatDateTime } from '@/lib/utils'
import type { HallazgoRow, PagedHallazgos } from '@/types'

interface Props {
  hallazgos: PagedHallazgos | null
  page: number
  onPageChange: (p: number) => void
}

export function DirectivoHallazgosTable({ hallazgos, page, onPageChange }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Todos mis Hallazgos</CardTitle>
            <CardDescription className="text-xs">Vista completa de hallazgos asignados</CardDescription>
          </div>
          {hallazgos && <Badge variant="secondary" className="text-xs">{hallazgos.total} registros</Badge>}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        {!hallazgos || hallazgos.hallazgos.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Sin registros</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Código', 'Descripción', 'Estado', 'Plan', 'Responsable', 'Cierre proyectado', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hallazgos.hallazgos.map((h: HallazgoRow) => (
                    <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-primary whitespace-nowrap font-semibold">{h.codigo_del_hallazgo}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-foreground/80" title={h.descripcion ?? undefined}>{h.descripcion}</td>
                      <td className="px-4 py-3"><StatusBadge value={h.estado} /></td>
                      <td className="px-4 py-3"><StatusBadge value={h.estado_plan_accion} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{h.responsable_plan_accion ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {h.fecha_cierre_proyectada ? formatDateTime(h.fecha_cierre_proyectada) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/hallazgos/${h.id}`} className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted transition-colors">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-3">
              <Pagination page={page} pages={hallazgos.pages} onChange={onPageChange} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
