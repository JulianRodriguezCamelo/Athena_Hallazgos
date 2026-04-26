'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}

export function ComboboxFilter({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQuery('') }}
        className={cn(
          'w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border text-xs',
          'bg-background border-input shadow-sm hover:bg-muted/40 transition-colors',
          value ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onChange(''))}
              className="hover:text-destructive rounded-full"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribir para filtrar…"
              className="w-full h-7 px-2 text-xs rounded-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o}
                  onClick={() => select(o)}
                  className={cn(
                    'px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/50 truncate',
                    value === o && 'bg-primary/10 text-primary font-medium',
                  )}
                >
                  {o}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
