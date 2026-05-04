'use client'

import { Settings2, Save, RotateCcw, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  isEditing: boolean
  isDirty: boolean
  isSaving: boolean
  onToggleEdit: () => void
  onOpenPalette: () => void
  onSave: () => void
  onReset: () => void
}

export function DashboardToolbar({
  isEditing, isDirty, isSaving,
  onToggleEdit, onOpenPalette, onSave, onReset,
}: Props) {
  return (
    <div className={cn(
      'flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors sm:px-4',
      isEditing ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30',
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <Settings2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium truncate">
          {isEditing ? 'Modo edición' : 'Dashboard personalizable'}
        </span>
        {isDirty && isEditing && (
          <Badge variant="outline" className="text-[10px] flex-shrink-0 text-amber-600 border-amber-400/50 bg-amber-50 dark:bg-amber-950/30">
            Sin guardar
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {isEditing ? (
          <>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={onOpenPalette}>
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Agregar widget</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-1.5" onClick={onReset} title="Restablecer">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Restablecer</span>
            </Button>
            <Button
              size="sm"
              className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-1.5"
              onClick={onSave}
              disabled={isSaving || !isDirty}
              title={isSaving ? 'Guardando…' : 'Guardar'}
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">{isSaving ? 'Guardando…' : 'Guardar'}</span>
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onToggleEdit} title="Cerrar edición">
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={onToggleEdit}>
            <Settings2 className="h-3.5 w-3.5" />
            Personalizar
          </Button>
        )}
      </div>
    </div>
  )
}
