import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export default function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin h-5 w-5 text-primary', className)} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  )
}
