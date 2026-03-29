import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  label?: string
}

function Input({ className, type, label, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const element = (
    <InputPrimitive
      id={inputId}
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
  if (!label) return element
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId} className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
        {label}
      </Label>
      {element}
    </div>
  )
}

export { Input }
export default Input
