import { useState, useEffect, useCallback } from 'react'
import { hallazgosApi } from '@/lib/api'
import type { Hallazgo, Meta } from '@/types'
import type { HallazgosFilters } from './useHallazgosFilters'

interface Options {
  filters: HallazgosFilters
  debouncedSearch: string
  page: number
}

export function useHallazgosData({ filters, debouncedSearch, page }: Options) {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await hallazgosApi.list({
        page,
        per_page: 15,
        search: debouncedSearch || undefined,
        estado: filters.estado || undefined,
        dependencia: filters.dependencia || undefined,
        vicepresidencia: filters.vicepresidencia || undefined,
        direccion: filters.direccion || undefined,
        responsable: filters.responsable || undefined,
        estado_plan_accion: filters.estadoPlan || undefined,
        vencido: filters.vencido ? 'true' : undefined,
        con_prorroga: filters.conProrroga ? 'true' : undefined,
        fecha_cierre_desde: filters.fechaCierreDesde || undefined,
        fecha_cierre_hasta: filters.fechaCierreHasta || undefined,
        fecha_inicial_desde: filters.fechaInicialDesde || undefined,
        fecha_inicial_hasta: filters.fechaInicialHasta || undefined,
      })
      const data = res.data as { hallazgos: Hallazgo[]; total: number; pages: number; page: number }
      setHallazgos(data.hallazgos)
      setMeta({ total: data.total, pages: data.pages, page: data.page })
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, filters.estado, filters.dependencia, filters.vicepresidencia,
    filters.direccion, filters.responsable, filters.estadoPlan, filters.vencido, filters.conProrroga,
    filters.fechaCierreDesde, filters.fechaCierreHasta, filters.fechaInicialDesde, filters.fechaInicialHasta])

  useEffect(() => { load() }, [load])

  return { hallazgos, meta, loading, reload: load }
}
