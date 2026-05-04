import { Search, Eye } from 'lucide-react'
import { formatDate, cleanText } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { Pagination } from '@/components/molecules/Pagination'
import type { Hallazgo, Meta } from '@/types'

interface Props {
  hallazgos: Hallazgo[]
  loading: boolean
  meta: Meta
  page: number
  setPage: (p: number) => void
  onSelect: (h: Hallazgo) => void
}

export function HallazgosTable({ hallazgos, loading, meta, page, setPage, onSelect }: Props) {
  if (loading) return <PageLoader />

  if (hallazgos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">No se encontraron hallazgos</p>
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
              <TableHead className="font-semibold text-xs">Código</TableHead>
              <TableHead className="font-semibold text-xs">Descripción</TableHead>
              <TableHead className="font-semibold text-xs">Dependencia</TableHead>
              <TableHead className="font-semibold text-xs">Estado</TableHead>
              <TableHead className="font-semibold text-xs">F. Inicial</TableHead>
              <TableHead className="font-semibold text-xs">F. Cierre</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {hallazgos.map((h) => (
              <TableRow key={h.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                  {h.codigo_del_hallazgo ?? '—'}
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate text-foreground text-sm" title={cleanText(h.descripcion) || '—'}>
                    {cleanText(h.descripcion) || '—'}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs max-w-[140px]">
                  <p className="truncate" title={h.dependencia_reporta_ero ?? h.direccion ?? ''}>
                    {h.dependencia_reporta_ero ?? h.direccion ?? '—'}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <StatusBadge value={h.estado} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                  {formatDate(h.fecha_inicial_evento)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                  {formatDate(h.fecha_cierre_proyectada)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => onSelect(h)}
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
