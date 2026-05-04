import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground border-transparent",
        secondary:   "bg-secondary text-secondary-foreground border-transparent",
        destructive: "bg-destructive/10 text-destructive border-transparent",
        outline:     "border-border text-foreground bg-transparent",
        success:     "bg-green-100 text-green-800 border-transparent",
        warning:     "bg-amber-100 text-amber-800 border-transparent",
        accent:      "bg-accent/10 text-accent border-transparent",
        ghost:       "bg-muted text-muted-foreground border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
