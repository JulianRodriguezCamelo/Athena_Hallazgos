'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Search, Filter, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { hallazgosApi } from '@/lib/api'
import { formatDate, getEstadoColor, cn } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import Button from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'

interface Hallazgo {
  id: number
  codigo_evento: string | null
  descripcion: string | null
  fecha_inicial_evento: string | null
  fecha_cierre_proyectada: string | null
  dependencia_reporta_ero: string | null
  estado: string | null
  reportado_por: string | null
  responsable_plan_accion: string | null
  estado_plan_accion: string | null
  prorroga: string | null
  id_plan_accion: string | null
  nombre_plan_accion: string | null
  descripcion_plan_accion: string | null
  observaciones: string | null
  aplicativo_afecta_ero: string | null
  fecha_finalizacion_evento: string | null
  reportado_para: string | null
  estado_accion: string | null
  responsable_accion: string | null
  fecha_cierre_final_prorroga: string | null
}

interface Meta { total: number; pages: number; page: number }

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getEstadoColor(value))}>
      {value}
    </span>
  )
}

export default function HallazgosPage() {
  const pathname = usePathname()
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Hallazgo | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [estados, setEstados] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await hallazgosApi.list({
        page: p,
        per_page: 15,
        ...(search && { search }),
        ...(estado && { estado }),
      })
      setHallazgos(res.data.hallazgos)
      setMeta({ total: res.data.total, pages: res.data.pages, page: res.data.page })
    } finally {
      setLoading(false)
    }
  }, [search, estado])

  useEffect(() => {
    hallazgosApi.estados().then((r) => setEstados(r.data.estados)).catch(() => {})
  }, [])

  useEffect(() => { load(page) }, [page]) // eslint-disable-line
  useEffect(() => { setPage(1); load(1) }, [search, estado]) // eslint-disable-line

  function clearFilters() {
    setSearch('')
    setEstado('')
  }

  const hasFilters = !!search || !!estado

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-[#E8E0E0] shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, descripción…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E8E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07B39]/30 focus:border-[#E07B39]"
              />
            </div>

            {/* Estado filter */}
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E8E0E0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E07B39]/30 focus:border-[#E07B39]"
            >
              <option value="">Todos los estados</option>
              {estados.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-3.5 h-3.5" />
                Limpiar
              </Button>
            )}

            <span className="ml-auto text-xs text-gray-400">
              {meta.total} registro{meta.total !== 1 ? 's' : ''}
            </span>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'p-2 rounded-lg border transition-colors',
                showFilters
                  ? 'bg-[#7B1F1F] border-[#7B1F1F] text-white'
                  : 'border-[#E8E0E0] text-gray-500 hover:bg-gray-50'
              )}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E8E0E0] shadow-sm overflow-hidden">
          {loading ? (
            <PageLoader />
          ) : hallazgos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Search className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No se encontraron hallazgos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#7B1F1F] text-white text-xs">
                    {[
                      'Código', 'Descripción', 'Dependencia', 'Estado',
                      'F. Inicial', 'F. Cierre Proy.', 'Responsable Plan', 'Estado Plan', 'Acción',
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFEF]">
                  {hallazgos.map((h, idx) => (
                    <tr
                      key={h.id}
                      className={cn(
                        'hover:bg-[#FFF9F7] transition-colors group',
                        idx % 2 === 0 ? 'bg-white' : 'bg-[#FDFAFA]'
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-[#7B1F1F] whitespace-nowrap">
                        {h.codigo_evento ?? '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-gray-800" title={h.descripcion ?? ''}>
                          {h.descripcion ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                        {h.dependencia_reporta_ero ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge value={h.estado} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                        {formatDate(h.fecha_inicial_evento)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                        {formatDate(h.fecha_cierre_proyectada)}
                      </td>
                      <td className="px-4 py-3 max-w-[140px]">
                        <p className="truncate text-gray-600 text-xs" title={h.responsable_plan_accion ?? ''}>
                          {h.responsable_plan_accion ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge value={h.estado_plan_accion} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(h)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[#F8F5F5] text-[#7B1F1F]"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#F0E8E8]">
              <p className="text-xs text-gray-400">
                Página {meta.page} de {meta.pages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, meta.pages) }, (_, i) => {
                  const p = i + 1
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-7 h-7 text-xs rounded-md',
                        p === page
                          ? 'bg-[#7B1F1F] text-white'
                          : 'hover:bg-gray-100 text-gray-600'
                      )}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  disabled={page >= meta.pages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Hallazgo ${selected?.codigo_evento ?? ''}`}
        size="xl"
      >
        {selected && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Descripción */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Descripción</p>
              <p className="text-sm text-gray-800 bg-[#F8F5F5] rounded-lg p-3">{selected.descripcion ?? '—'}</p>
            </div>

            {/* Grid de campos */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                ['Código del evento', selected.codigo_evento],
                ['Estado', selected.estado],
                ['Dependencia ERO', selected.dependencia_reporta_ero],
                ['Reportado para', selected.reportado_para],
                ['Reportado por', selected.reportado_por],
                ['Aplicativo afecta ERO', selected.aplicativo_afecta_ero],
                ['Fecha inicial', formatDate(selected.fecha_inicial_evento)],
                ['Fecha finalización', formatDate(selected.fecha_finalizacion_evento)],
                ['Fecha cierre proyectada', formatDate(selected.fecha_cierre_proyectada)],
                ['Prórroga', selected.prorroga],
                ['Fecha cierre prórroga', formatDate(selected.fecha_cierre_final_prorroga)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{value ?? '—'}</p>
                </div>
              ))}
            </div>

            {/* Plan de acción */}
            <div className="rounded-lg border border-[#E8E0E0] overflow-hidden">
              <div className="bg-[#F8F5F5] px-4 py-2.5 border-b border-[#E8E0E0]">
                <p className="text-xs font-semibold text-[#7B1F1F] uppercase tracking-wide">Plan de acción</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['ID Plan', selected.id_plan_accion],
                  ['Estado plan', selected.estado_plan_accion],
                  ['Responsable plan', selected.responsable_plan_accion],
                  ['Estado acción', selected.estado_accion],
                  ['Responsable acción', selected.responsable_accion],
                  ['Nombre del plan', selected.nombre_plan_accion],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-gray-700 mt-0.5">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
              {selected.descripcion_plan_accion && (
                <div className="px-4 pb-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Descripción del plan</p>
                  <p className="text-sm text-gray-700 bg-[#F8F5F5] rounded-lg p-3">{selected.descripcion_plan_accion}</p>
                </div>
              )}
            </div>

            {/* Observaciones */}
            {selected.observaciones && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Observaciones</p>
                <p className="text-sm text-gray-700 bg-[#F8F5F5] rounded-lg p-3">{selected.observaciones}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardShell>
  )
}
