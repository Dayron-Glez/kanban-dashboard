import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button, SearchInput, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"
import { CreateColumnSheet, type CreateColumnValues } from "@/features/column/index"
import { useProject } from "@/features/project"
import { useCreateColumn, useColumns } from "../api/columns"
import { useTasks } from "../api/tasks"
import { useBoardScroll } from "../context/boardScrollCtx"
import { useProjectId } from "../hooks/useProjectId"
import { ViewSwitch } from "./ViewSwitch"

interface Props {
  searchValue: string
  onSearchChange: (value: string) => void
}

/**
 * Acciones del tablero que van en el slot derecho del Header: filtro de
 * tareas y creación de columnas. Viven aquí y no en el Header compartido
 * para que este no dependa de useKanban y pueda montarse en las pantallas
 * sin proyecto activo (Home, /projects, 404).
 */
export function BoardHeaderActions({ searchValue, onSearchChange }: Props) {
  const projectId = useProjectId()
  const { data: columns = [] } = useColumns(projectId)
  const { data: tasks = [] } = useTasks(projectId)
  const isOwner = useProject(projectId).data?.role === "owner"
  const createColumn = useCreateColumn(projectId)
  const scrollContainerRef = useBoardScroll()
  const [createColumnOpen, setCreateColumnOpen] = useState<boolean>(false)

  const handleCreateColumn = ({ title, category }: CreateColumnValues) => {
    createColumn.mutate(
      { title: title.trim() || `Columna ${columns.length + 1}`, category },
      {
        onSuccess: () => {
          // Tras pintar la columna nueva, para que el ancho ya la incluya.
          requestAnimationFrame(() => {
            const container = scrollContainerRef.current
            container?.scrollTo({ left: container.scrollWidth, behavior: "smooth" })
          })
        },
      }
    )
    setCreateColumnOpen(false)
  }

  return (
    <>
      <ViewSwitch />

      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <SearchInput
              value={searchValue}
              onChange={onSearchChange}
              disabled={tasks.length === 0}
              className="h-8"
            />
          </div>
        </TooltipTrigger>
        {tasks.length === 0 && (
          <TooltipContent>Crea una tarea para empezar a filtrar</TooltipContent>
        )}
      </Tooltip>

      {isOwner && (
        <>
          <Button
            onClick={() => setCreateColumnOpen(true)}
            className="group hover:border-primary hover:bg-primary/5 hover:text-primary border-2 border-dashed transition-all"
            variant="outline"
            size="sm"
            disabled={columns.length >= 6}
          >
            <IconPlus className="mr-1 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            Agregar Columna
          </Button>
          <CreateColumnSheet
            open={createColumnOpen}
            onOpenChange={setCreateColumnOpen}
            onSave={handleCreateColumn}
          />
        </>
      )}
    </>
  )
}
