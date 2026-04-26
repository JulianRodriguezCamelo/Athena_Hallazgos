import { ListChecks, Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { Pagination } from '@/components/molecules/Pagination'
import type { Actividad, Meta } from '@/types'

interface Props {
  actividades: Actividad[]
  loading: boolean
  meta: Meta
  page: number
  setPage: (p: number) => void
  onSelect: (a: Actividad) => void
}

export function ActividadesTable({ actividades, loading, meta, page, setPage, onSelect }: Props) {
  if (loading) return <PageLoader />

  if (actividades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <ListChecks className="w-8 h-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">No se encontraron actividades</p>
        <p className="text-xs text-muted-foreground mt-1">Intenta ajustar los filtros de búsqueda</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs">Hallazgo</TableHead>
              <TableHead className="font-semibold text-xs">Plan de acción</TableHead>
              <TableHead className="font-semibold text-xs">Responsable</TableHead>
              <TableHead className="font-semibold text-xs">Estado Acción</TableHead>
              <TableHead className="font-semibold text-xs">F. Compromiso</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {actividades.map((a) => (
              <TableRow key={a.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                  {a.codigo_del_hallazgo ?? '—'}
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate text-foreground text-sm" title={a.descripcion ?? ''}>{a.descripcion ?? '—'}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs max-w-[140px]">
                  <p className="truncate" title={a.responsable ?? ''}>{a.responsable ?? '—'}</p>
                </TableCell>
                <TableCell className="max-w-[160px]">
                  <div className="truncate"><StatusBadge value={a.estado_accion} /></div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                  {formatDate(a.fecha_compromiso)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => onSelect(a)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 text-primary hover:bg-primary/10"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta.pages > 1 && (
        <>
          <Separator />
          <Pagination page={page} pages={meta.pages} onChange={setPage} />
        </>
      )}
    </>
  )
}
