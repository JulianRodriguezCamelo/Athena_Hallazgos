import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Pagination } from '@/components/shared/Pagination'
import { EstadoBadge } from '@/components/shared/EstadoBadge'
import type { PagedHallazgos } from './types'

function formatDateTime(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface HallazgosTableProps {
  hallazgos: PagedHallazgos | null
  hPage: number
  onPageChange: (p: number) => void
}

export function HallazgosTable({ hallazgos, hPage, onPageChange }: HallazgosTableProps) {
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
                    {['Código', 'Descripción', 'Estado', 'Plan', 'Responsable', 'Cierre proyectado'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hallazgos.hallazgos.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-primary whitespace-nowrap font-semibold">
                        {h.codigo_del_hallazgo}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-foreground/80" title={h.descripcion ?? undefined}>
                        {h.descripcion}
                      </td>
                      <td className="px-4 py-3"><EstadoBadge estado={h.estado} /></td>
                      <td className="px-4 py-3"><EstadoBadge estado={h.estado_plan_accion} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{h.responsable_plan_accion ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {h.fecha_cierre_proyectada ? formatDateTime(h.fecha_cierre_proyectada) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-3">
              <Pagination page={hPage} pages={hallazgos.pages} onChange={onPageChange} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
