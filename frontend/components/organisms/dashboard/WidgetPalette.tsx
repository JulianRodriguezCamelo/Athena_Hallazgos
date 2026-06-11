'use client'

import { useState, useMemo } from 'react'
import { Command } from 'cmdk'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LayoutDashboard, Plus, Check } from 'lucide-react'
import { WIDGET_REGISTRY } from '@/lib/widgetRegistry'
import type { WidgetType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (widgetType: WidgetType) => void
  currentWidgetTypes: WidgetType[]
  role: 'vicepresidente' | 'directivo' | 'administrador'
}

const GROUP_LABELS: Record<string, string> = {
  kpi: 'Indicadores (KPIs)',
  chart: 'Gráficos',
  table: 'Tablas',
  panel: 'Paneles',
}

export function WidgetPalette({ open, onClose, onAdd, currentWidgetTypes, role }: Props) {
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const groups: Record<string, { type: WidgetType; label: string; description: string; alreadyAdded: boolean }[]> = {}
    for (const [type, entry] of Object.entries(WIDGET_REGISTRY) as [WidgetType, typeof WIDGET_REGISTRY[WidgetType]][]) {
      if (!entry.meta.roles.includes(role)) continue
      const g = entry.meta.group
      if (!groups[g]) groups[g] = []
      groups[g].push({
        type,
        label: entry.meta.label,
        description: entry.meta.description,
        alreadyAdded: currentWidgetTypes.includes(type),
      })
    }
    return groups
  }, [role, currentWidgetTypes])

  function handleSelect(type: WidgetType, alreadyAdded: boolean) {
    if (alreadyAdded) return
    onAdd(type)
    onClose()
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setSearch('') } }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            Agregar widget al dashboard
          </DialogTitle>
        </DialogHeader>
        <Command shouldFilter>
          <Command.Input
            placeholder="Buscar widget..."
            value={search}
            onValueChange={setSearch}
            className="w-full px-4 py-3 text-sm bg-transparent border-b outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[400px] overflow-y-auto py-2">
            <Command.Empty className="px-4 py-10 text-center text-sm text-muted-foreground">
              No se encontraron widgets
            </Command.Empty>
            {Object.entries(grouped).map(([group, items]) => (
              <Command.Group
                key={group}
                heading={GROUP_LABELS[group] ?? group}
                className="[&>[cmdk-group-heading]]:px-4 [&>[cmdk-group-heading]]:py-2 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:text-muted-foreground [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider"
              >
                {items.map(({ type, label, description, alreadyAdded }) => (
                  <Command.Item
                    key={type}
                    value={`${label} ${description}`}
                    disabled={alreadyAdded}
                    onSelect={() => handleSelect(type, alreadyAdded)}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer
                               hover:bg-accent aria-selected:bg-accent
                               aria-disabled:opacity-50 aria-disabled:cursor-not-allowed
                               transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-xs text-muted-foreground truncate">{description}</p>
                    </div>
                    {alreadyAdded ? (
                      <Check className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
