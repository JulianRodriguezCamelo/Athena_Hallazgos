import { useState, useEffect, useCallback } from 'react'
import { actividadesApi } from '@/lib/api'
import type { Actividad, Meta } from '@/types'
import type { HallazgosFilters } from './useHallazgosFilters'

interface Options {
  filters: HallazgosFilters
  debouncedSearch: string
  page: number
}

export function useActividadesData({ filters, debouncedSearch, page }: Options) {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await actividadesApi.list({
        page,
        per_page: 15,
        search: debouncedSearch || undefined,
        responsable: filters.responsable || undefined,
        estado_plan_accion: filters.estadoPlan || undefined,
        vencido: filters.vencido ? 'true' : undefined,
        con_prorroga: filters.conProrroga ? 'true' : undefined,
      })
      const data = res.data as { actividades: Actividad[]; total: number; pages: number; page: number }
      setActividades(data.actividades)
      setMeta({ total: data.total, pages: data.pages, page: data.page })
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, filters.responsable, filters.estadoPlan, filters.vencido, filters.conProrroga])

  useEffect(() => { load() }, [load])

  return { actividades, meta, loading, reload: load }
}
