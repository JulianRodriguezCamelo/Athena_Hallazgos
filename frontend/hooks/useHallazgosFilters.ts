import { useState } from 'react'
import { useDebounce } from './useDebounce'

export interface HallazgosFilters {
  search: string
  estado: string
  dependencia: string
  vicepresidencia: string
  direccion: string
  responsable: string
  estadoPlan: string
  vencido: boolean
  conProrroga: boolean
  fechaCierreDesde: string
  fechaCierreHasta: string
  fechaInicialDesde: string
  fechaInicialHasta: string
}

const INITIAL: HallazgosFilters = {
  search: '', estado: '', dependencia: '', vicepresidencia: '',
  direccion: '', responsable: '', estadoPlan: '', vencido: false, conProrroga: false,
  fechaCierreDesde: '', fechaCierreHasta: '', fechaInicialDesde: '', fechaInicialHasta: '',
}

export function useHallazgosFilters() {
  const [filters, setFilters] = useState<HallazgosFilters>(INITIAL)
  const debouncedSearch = useDebounce(filters.search, 400)

  function setFilter<K extends keyof HallazgosFilters>(key: K, value: HallazgosFilters[K]) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  function clearAll() {
    setFilters(INITIAL)
  }

  const hasFilters = !!filters.search || !!filters.estado || !!filters.dependencia ||
    !!filters.vicepresidencia || !!filters.direccion || !!filters.responsable ||
    !!filters.estadoPlan || filters.vencido || filters.conProrroga ||
    !!filters.fechaCierreDesde || !!filters.fechaCierreHasta ||
    !!filters.fechaInicialDesde || !!filters.fechaInicialHasta

  const activeFiltersCount = [
    filters.estado, filters.dependencia, filters.vicepresidencia, filters.direccion,
    filters.responsable, filters.estadoPlan,
    filters.vencido ? '1' : '', filters.conProrroga ? '1' : '',
    filters.fechaCierreDesde, filters.fechaCierreHasta,
    filters.fechaInicialDesde, filters.fechaInicialHasta,
  ].filter(Boolean).length

  return { filters, setFilter, clearAll, hasFilters, activeFiltersCount, debouncedSearch }
}
