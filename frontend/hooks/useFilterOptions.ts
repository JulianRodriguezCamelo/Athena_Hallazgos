import { useState, useEffect } from 'react'
import { hallazgosApi } from '@/lib/api'

// Simple module-level cache so navigating back doesn't re-fetch
let cache: FilterOptions | null = null

export interface FilterOptions {
  estados: string[]
  dependencias: string[]
  vicepresidencias: string[]
  direcciones: string[]
  responsables: string[]
  estadosPlan: string[]
  loading: boolean
}

export function useFilterOptions(): FilterOptions {
  const [options, setOptions] = useState<FilterOptions>(
    cache ?? {
      estados: [], dependencias: [], vicepresidencias: [],
      direcciones: [], responsables: [], estadosPlan: [], loading: !cache,
    }
  )

  useEffect(() => {
    if (cache) return

    Promise.allSettled([
      hallazgosApi.estados(),
      hallazgosApi.dependencias(),
      hallazgosApi.vicepresidencias(),
      hallazgosApi.direcciones(),
      hallazgosApi.responsables(),
      hallazgosApi.estadosPlan(),
    ]).then(([est, dep, vp, dir, resp, plan]) => {
      const result: FilterOptions = {
        estados:          est.status === 'fulfilled' ? (est.value.data as { estados: string[] }).estados : [],
        dependencias:     dep.status === 'fulfilled' ? (dep.value.data as { dependencias: string[] }).dependencias : [],
        vicepresidencias: vp.status === 'fulfilled'  ? (vp.value.data as { vicepresidencias: string[] }).vicepresidencias : [],
        direcciones:      dir.status === 'fulfilled' ? (dir.value.data as { direcciones: string[] }).direcciones : [],
        responsables:     resp.status === 'fulfilled' ? (resp.value.data as { responsables: string[] }).responsables : [],
        estadosPlan:      plan.status === 'fulfilled' ? (plan.value.data as { estados_plan_accion: string[] }).estados_plan_accion : [],
        loading: false,
      }
      cache = result
      setOptions(result)
    })
  }, [])

  return options
}
