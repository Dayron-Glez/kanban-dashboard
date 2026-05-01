import { IconArrowRight } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, ScrollArea, Skeleton } from "@/shared"
import type { ActivityItem } from "../hooks/useAnalytics"

interface ActivityFeedProps {
  items: ActivityItem[]
  loading: boolean
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Actividad reciente</CardTitle>
        <p className="text-sm text-muted-foreground">Últimos 15 movimientos de tareas</p>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="px-6 pb-4 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-muted-foreground">
            Aún no hay movimientos registrados. Mueve tareas entre columnas para ver la actividad.
          </p>
        ) : (
          <ScrollArea className="h-[210px]">
            <ul className="px-6 pb-4 flex flex-col gap-2">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0">
                  <p className="text-sm font-medium text-primary truncate">{item.taskContent}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {item.fromColumnTitle ? (
                      <>
                        <span>{item.fromColumnTitle}</span>
                        <IconArrowRight size={12} />
                      </>
                    ) : null}
                    <span className="text-primary font-medium">{item.toColumnTitle}</span>
                    <span className="ml-auto shrink-0">{item.movedAtRelative}</span>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
