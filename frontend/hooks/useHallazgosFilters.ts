'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

function fromParams(params: URLSearchParams): HallazgosFilters {
  return {
    search:          params.get('search') ?? '',
    estado:          params.get('estado') ?? '',
    dependencia:     params.get('dependencia') ?? '',
    vicepresidencia: params.get('vicepresidencia') ?? '',
    direccion:       params.get('direccion') ?? '',
    responsable:     params.get('responsable') ?? '',
    estadoPlan:      params.get('estadoPlan') ?? '',
    vencido:         params.get('vencido') === 'true',
    conProrroga:     params.get('conProrroga') === 'true',
    fechaCierreDesde:  params.get('fechaCierreDesde') ?? '',
    fechaCierreHasta:  params.get('fechaCierreHasta') ?? '',
    fechaInicialDesde: params.get('fechaInicialDesde') ?? '',
    fechaInicialHasta: params.get('fechaInicialHasta') ?? '',
  }
}

function toParams(filters: HallazgosFilters): string {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v !== false) p.set(k, String(v))
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function useHallazgosFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<HallazgosFilters>(() => fromParams(searchParams))
  const debouncedSearch = useDebounce(filters.search, 400)
  const isMounted = useRef(false)

  // Sincronizar URL → estado cuando el usuario usa el botón atrás
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    setFilters(fromParams(searchParams))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  // Sincronizar estado → URL en cada cambio de filtro
  useEffect(() => {
    if (!isMounted.current) return
    router.replace(toParams(filters), { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  function setFilter<K extends keyof HallazgosFilters>(key: K, value: HallazgosFilters[K]) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  function clearAll() { setFilters(INITIAL) }

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
