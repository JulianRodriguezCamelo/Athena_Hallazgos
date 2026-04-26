import { Activity, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDateTime } from '@/lib/utils'
import type { UploadItem } from '@/types'

interface Props {
  uploads: UploadItem[]
}

export function CargasRecientesCard({ uploads }: Props) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Cargas Recientes</CardTitle>
            <CardDescription className="text-xs">Últimos archivos cargados al sistema</CardDescription>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-2 divide-y divide-border">
        {uploads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Sin cargas recientes</p>
        ) : (
          uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-3 py-3 first:pt-2 last:pb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate font-medium">{u.filename_original}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(u.uploaded_at)}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">{u.total_registros} reg.</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
