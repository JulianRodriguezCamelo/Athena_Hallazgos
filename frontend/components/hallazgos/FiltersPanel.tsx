'use client'

import { useState, type ElementType } from 'react'
import {
  Search, X, AlertTriangle, Clock, SlidersHorizontal,
  Building2, User, Calendar, RotateCcw, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { input } from '@/components/ui/input'
import Select from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ComboboxFilter } from './ComboboxFilter'

function FilterPill({
  label, active, onClick, variant = 'default', icon: Icon,
}: {
  label: string; active: boolean; onClick: () => void
  variant?: 'default' | 'danger' | 'warning'
  icon?: ElementType
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200',
        active
          ? variant === 'danger'
            ? 'bg-red-500/10 border-red-400/40 text-red-600 dark:text-red-400 shadow-sm'
            : variant === 'warning'
            ? 'bg-amber-500/10 border-amber-400/40 text-amber-600 dark:text-amber-400 shadow-sm'
            : 'bg-primary/10 border-primary/40 text-primary shadow-sm'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border/80'
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}

export interface FiltersPanelProps {
  search: string; setSearch: (v: string) => void
  estado: string; setEstado: (v: string) => void
  dependencia: string; setDependencia: (v: string) => void
  vicepresidencia: string; setVicepresidencia: (v: string) => void
  direccion: string; setDireccion: (v: string) => void
  responsable: string; setResponsable: (v: string) => void
  estadoPlan: string; setEstadoPlan: (v: string) => void
  vencido: boolean; setVencido: (v: boolean) => void
  conProrroga: boolean; setConProrroga: (v: boolean) => void
  fechaCierreDesde: string; setFechaCierreDesde: (v: string) => void
  fechaCierreHasta: string; setFechaCierreHasta: (v: string) => void
  fechaInicialDesde: string; setFechaInicialDesde: (v: string) => void
  fechaInicialHasta: string; setFechaInicialHasta: (v: string) => void
  estados: string[]; dependencias: string[]; vicepresidencias: string[]
  direcciones: string[]; responsables: string[]; estadosPlan: string[]
  hasFilters: boolean; clearAll: () => void; total: number
}

export function FiltersPanel({
  search, setSearch,
  estado, setEstado,
  dependencia, setDependencia,
  vicepresidencia, setVicepresidencia,
  direccion, setDireccion,
  responsable, setResponsable,
  estadoPlan, setEstadoPlan,
  vencido, setVencido,
  conProrroga, setConProrroga,
  fechaCierreDesde, setFechaCierreDesde,
  fechaCierreHasta, setFechaCierreHasta,
  fechaInicialDesde, setFechaInicialDesde,
  fechaInicialHasta, setFechaInicialHasta,
  estados, dependencias, vicepresidencias, direcciones, responsables, estadosPlan,
  hasFilters, clearAll, total,
}: FiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const estadoOptions = estados.map((e) => ({ value: e, label: e }))
  const depOptions = dependencias.map((d) => ({ value: d, label: d }))
  const estadoPlanOptions = estadosPlan.map((e) => ({ value: e, label: e }))

  const activeFiltersCount = [
    estado, dependencia, vicepresidencia, direccion, responsable, estadoPlan,
    fechaCierreDesde, fechaCierreHasta, fechaInicialDesde, fechaInicialHasta,
  ].filter(Boolean).length + (vencido ? 1 : 0) + (conProrroga ? 1 : 0)

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Main search bar */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <FilterPill label="Vencidos" active={vencido} onClick={() => setVencido(!vencido)} variant="danger" icon={AlertTriangle} />
          <FilterPill label="Con prórroga" active={conProrroga} onClick={() => setConProrroga(!conProrroga)} variant="warning" icon={Clock} />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex items-center gap-2">
            <div className="min-w-36">
              <Select value={estado} onChange={(e) => setEstado(e.target.value)} options={estadoOptions} placeholder="Estado" />
            </div>
            <div className="min-w-40">
              <Select value={estadoPlan} onChange={(e) => setEstadoPlan(e.target.value)} options={estadoPlanOptions} placeholder="Estado plan" />
            </div>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="ml-auto h-8 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3 h-3 mr-1.5" />Limpiar filtros
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
                  <Building2 className="w-3.5 h-3.5" />Organización
                </h4>
                <div className="space-y-2">
                  {vicepresidencias.length > 0 && (
                    <ComboboxFilter value={vicepresidencia} onChange={setVicepresidencia} options={vicepresidencias} placeholder="Área / Vicepresidencia" />
                  )}
                  {direcciones.length > 0 && (
                    <ComboboxFilter value={direccion} onChange={setDireccion} options={direcciones} placeholder="Dirección" />
                  )}
                  {dependencias.length > 0 && (
                    <Select value={dependencia} onChange={(e) => setDependencia(e.target.value)} options={depOptions} placeholder="Dependencia" />
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />Responsable
                </h4>
                <div className="space-y-2">
                  <ComboboxFilter value={responsable} onChange={setResponsable} options={responsables} placeholder="Responsable" />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />Fechas
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fecha cierre proyectada</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="date" value={fechaCierreDesde} onChange={(e) => setFechaCierreDesde(e.target.value)}
                        className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      <span className="text-xs text-muted-foreground">→</span>
                      <input type="date" value={fechaCierreHasta} onChange={(e) => setFechaCierreHasta(e.target.value)}
                        className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fecha inicial evento</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="date" value={fechaInicialDesde} onChange={(e) => setFechaInicialDesde(e.target.value)}
                        className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      <span className="text-xs text-muted-foreground">→</span>
                      <input type="date" value={fechaInicialHasta} onChange={(e) => setFechaInicialHasta(e.target.value)}
                        className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
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
          {estado && (
            <Badge variant="secondary" className="gap-1.5 pr-1.5">Estado: {estado}
              <button onClick={() => setEstado('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {dependencia && (
            <Badge variant="secondary" className="gap-1.5 pr-1.5">
              {dependencia.length > 20 ? dependencia.slice(0, 20) + '…' : dependencia}
              <button onClick={() => setDependencia('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {vicepresidencia && (
            <Badge variant="secondary" className="gap-1.5 pr-1.5">
              Área: {vicepresidencia.length > 16 ? vicepresidencia.slice(0, 16) + '…' : vicepresidencia}
              <button onClick={() => setVicepresidencia('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {direccion && (
            <Badge variant="secondary" className="gap-1.5 pr-1.5">
              Dir: {direccion.length > 16 ? direccion.slice(0, 16) + '…' : direccion}
              <button onClick={() => setDireccion('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {responsable && (
            <Badge variant="secondary" className="gap-1.5 pr-1.5">
              {responsable.length > 16 ? responsable.slice(0, 16) + '…' : responsable}
              <button onClick={() => setResponsable('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {estadoPlan && (
            <Badge variant="secondary" className="gap-1.5 pr-1.5">Plan: {estadoPlan}
              <button onClick={() => setEstadoPlan('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {vencido && (
            <Badge variant="destructive" className="gap-1.5 pr-1.5">Vencidos
              <button onClick={() => setVencido(false)} className="hover:bg-red-400/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {conProrroga && (
            <Badge className="gap-1.5 pr-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200">
              Con prórroga
              <button onClick={() => setConProrroga(false)} className="hover:bg-amber-300/30 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {(fechaCierreDesde || fechaCierreHasta) && (
            <Badge variant="secondary" className="gap-1.5 pr-1.5">
              Cierre: {fechaCierreDesde || '…'} → {fechaCierreHasta || '…'}
              <button onClick={() => { setFechaCierreDesde(''); setFechaCierreHasta('') }} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {(fechaInicialDesde || fechaInicialHasta) && (
            <Badge variant="secondary" className="gap-1.5 pr-1.5">
              Inicial: {fechaInicialDesde || '…'} → {fechaInicialHasta || '…'}
              <button onClick={() => { setFechaInicialDesde(''); setFechaInicialHasta('') }} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
