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
        <p className="text-muted-foreground text-sm">Últimos 15 movimientos de tareas</p>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="flex flex-col gap-3 px-6 pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-6 pb-4 text-sm">
            Aún no hay movimientos registrados. Mueve tareas entre columnas para ver la actividad.
          </p>
        ) : (
          <ScrollArea className="h-[210px]">
            <ul className="flex flex-col gap-2 px-6 pb-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="border-border flex flex-col gap-0.5 border-b py-2 last:border-0"
                >
                  <p className="text-primary truncate text-sm font-medium">{item.taskContent}</p>
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
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
