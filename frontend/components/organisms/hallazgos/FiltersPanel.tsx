'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, ChevronDown, AlertTriangle, Clock, X, RotateCcw, Building2, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { FilterPill } from '@/components/atoms/FilterPill'
import { ComboboxFilter } from '@/components/molecules/ComboboxFilter'
import type { HallazgosFilters } from '@/hooks/useHallazgosFilters'
import type { FilterOptions } from '@/hooks/useFilterOptions'

interface Props {
  filters: HallazgosFilters
  setFilter: <K extends keyof HallazgosFilters>(key: K, value: HallazgosFilters[K]) => void
  clearAll: () => void
  hasFilters: boolean
  activeFiltersCount: number
  options: FilterOptions
  total: number
}

export function FiltersPanel({ filters, setFilter, clearAll, hasFilters, activeFiltersCount, options, total }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const estadoOptions = options.estados.map((e) => ({ value: e, label: e }))
  const depOptions = options.dependencias.map((d) => ({ value: d, label: d }))
  const estadoPlanOptions = options.estadosPlan.map((e) => ({ value: e, label: e }))

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Main search bar */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Buscar por código, descripción, plan de acción…"
                className="pl-10 h-10 bg-muted/30 border-muted-foreground/20 focus:bg-background"
              />
            </div>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant={isExpanded ? 'secondary' : 'outline'} className="gap-2 h-10">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                      {activeFiltersCount}
                    </Badge>
                  )}
                  <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <span className="text-sm text-muted-foreground font-medium tabular-nums">
                {total.toLocaleString()} {total === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick filters */}
        <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Acceso rápido:</span>
            <FilterPill label="Vencidos" active={filters.vencido} onClick={() => setFilter('vencido', !filters.vencido)} />
            <FilterPill label="Con prórroga" active={filters.conProrroga} onClick={() => setFilter('conProrroga', !filters.conProrroga)} />
            <Separator orientation="vertical" className="h-5 mx-1" />
            <div className="flex items-center gap-2">
              <div className="min-w-36">
                <Select value={filters.estado} onChange={(e) => setFilter('estado', e.target.value)} options={estadoOptions} placeholder="Estado" />
              </div>
              <div className="min-w-40">
                <Select value={filters.estadoPlan} onChange={(e) => setFilter('estadoPlan', e.target.value)} options={estadoPlanOptions} placeholder="Estado plan" />
              </div>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="ml-auto h-8 text-xs text-muted-foreground hover:text-foreground">
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Expanded filters */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <div className="p-4 bg-muted/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Organización
                  </h4>
                  <div className="space-y-2">
                    {options.vicepresidencias.length > 0 && (
                      <ComboboxFilter value={filters.vicepresidencia} onChange={(v) => setFilter('vicepresidencia', v)} options={options.vicepresidencias} placeholder="Área / Vicepresidencia" />
                    )}
                    {options.direcciones.length > 0 && (
                      <ComboboxFilter value={filters.direccion} onChange={(v) => setFilter('direccion', v)} options={options.direcciones} placeholder="Dirección" />
                    )}
                    {options.dependencias.length > 0 && (
                      <Select value={filters.dependencia} onChange={(e) => setFilter('dependencia', e.target.value)} options={depOptions} placeholder="Dependencia" />
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Responsable
                  </h4>
                  <div className="space-y-2">
                    <ComboboxFilter value={filters.responsable} onChange={(v) => setFilter('responsable', v)} options={options.responsables} placeholder="Responsable" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Fechas
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fecha cierre proyectada</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="date" value={filters.fechaCierreDesde} onChange={(e) => setFilter('fechaCierreDesde', e.target.value)} className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                        <span className="text-xs text-muted-foreground">→</span>
                        <input type="date" value={filters.fechaCierreHasta} onChange={(e) => setFilter('fechaCierreHasta', e.target.value)} className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fecha inicial evento</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="date" value={filters.fechaInicialDesde} onChange={(e) => setFilter('fechaInicialDesde', e.target.value)} className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                        <span className="text-xs text-muted-foreground">→</span>
                        <input type="date" value={filters.fechaInicialHasta} onChange={(e) => setFilter('fechaInicialHasta', e.target.value)} className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="px-4 py-3 border-t border-border/50 flex flex-wrap gap-2">
            {filters.estado && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Estado: {filters.estado}
                <button onClick={() => setFilter('estado', '')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.dependencia && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                {filters.dependencia.length > 20 ? filters.dependencia.slice(0, 20) + '…' : filters.dependencia}
                <button onClick={() => setFilter('dependencia', '')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.vicepresidencia && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Área: {filters.vicepresidencia.length > 16 ? filters.vicepresidencia.slice(0, 16) + '…' : filters.vicepresidencia}
                <button onClick={() => setFilter('vicepresidencia', '')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.direccion && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Dir: {filters.direccion.length > 16 ? filters.direccion.slice(0, 16) + '…' : filters.direccion}
                <button onClick={() => setFilter('direccion', '')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.responsable && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                {filters.responsable.length > 16 ? filters.responsable.slice(0, 16) + '…' : filters.responsable}
                <button onClick={() => setFilter('responsable', '')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.estadoPlan && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Plan: {filters.estadoPlan}
                <button onClick={() => setFilter('estadoPlan', '')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.vencido && (
              <Badge variant="destructive" className="gap-1.5 pr-1.5">
                Vencidos
                <button onClick={() => setFilter('vencido', false)} className="hover:bg-red-400/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.conProrroga && (
              <Badge className="gap-1.5 pr-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Con prórroga
                <button onClick={() => setFilter('conProrroga', false)} className="hover:bg-amber-300/30 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {(filters.fechaCierreDesde || filters.fechaCierreHasta) && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Cierre: {filters.fechaCierreDesde || '…'} → {filters.fechaCierreHasta || '…'}
                <button onClick={() => { setFilter('fechaCierreDesde', ''); setFilter('fechaCierreHasta', '') }} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {(filters.fechaInicialDesde || filters.fechaInicialHasta) && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Inicial: {filters.fechaInicialDesde || '…'} → {filters.fechaInicialHasta || '…'}
                <button onClick={() => { setFilter('fechaInicialDesde', ''); setFilter('fechaInicialHasta', '') }} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
