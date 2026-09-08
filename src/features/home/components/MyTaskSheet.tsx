import { IconArrowRight } from "@tabler/icons-react"
import { Link } from "react-router"
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/index"
import { PRIORITY_CONFIG, SIZE_CONFIG } from "@/features/task/index"
import type { MyTask } from "../hooks/useMyTasks"

interface Props {
  task: MyTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[10.5px] font-bold tracking-[0.07em] uppercase">
        {label}
      </span>
      <div className="text-foreground flex items-center gap-2 text-[13px]">{children}</div>
    </div>
  )
}

/**
 * Detalle de solo lectura de una tarea del inicio. No se reutiliza el
 * DetailsTaskSheet del tablero porque su formulario lee los miembros de
 * useKanban, que fuera de un proyecto está vacío: el asignado saldría en
 * blanco. A cambio, aquí sí se puede mostrar proyecto y columna.
 */
export function MyTaskSheet({ task, open, onOpenChange }: Props) {
  if (!task) return null

  const priority = PRIORITY_CONFIG[task.priority]
  const size = SIZE_CONFIG[task.size]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card flex flex-col gap-6 border-transparent">
        <SheetHeader className="gap-1">
          <SheetTitle className="text-foreground text-base leading-snug font-semibold">
            {task.content}
          </SheetTitle>
          <SheetDescription>Detalles de la tarea</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4">
          <Field label="Proyecto">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: task.projectColor }}
            />
            {task.projectName}
          </Field>

          <Field label="Estado">{task.columnTitle}</Field>

          <Field label="Prioridad">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority.className}`}
            >
              {priority.label}
            </span>
          </Field>

          <Field label="Tamaño">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${size.className}`}
            >
              {size.label}
            </span>
          </Field>
        </div>

        <div className="mt-auto px-4 pb-4">
          <Button asChild className="w-full" onClick={() => onOpenChange(false)}>
            <Link to={`/projects/${task.projectId}`}>
              Abrir en el tablero
              <IconArrowRight size={15} className="ml-1" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
