"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  placeholder?: string
}

function Select({ className, label, options, placeholder, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const element = (
    <div className="relative">
      <select
        id={selectId}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-8 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
    </div>
  )
  if (!label) return element
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={selectId} className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
        {label}
      </Label>
      {element}
    </div>
  )
}

export { Select }
export default Select
