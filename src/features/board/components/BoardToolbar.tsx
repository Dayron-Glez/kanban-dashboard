import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import {
  Button,
  SearchInput,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/index"
import { CreateColumnSheet } from "@/features/column/index"
import { useKanban } from "../hooks/useKanban"

interface Props {
  searchValue: string
  onSearchChange: (value: string) => void
}

/**
 * Barra de acciones del tablero: filtro de tareas y creación de columnas.
 * Vive sobre las columnas y no en el Header, que queda reservado para la
 * ruta y la búsqueda global de proyectos (⌘K), como en el prototipo.
 */
export function BoardToolbar({ searchValue, onSearchChange }: Props) {
  const { createNewColumn, columns, tasks, userRole } = useKanban()
  const [createColumnOpen, setCreateColumnOpen] = useState<boolean>(false)

  const isOwner = userRole === "owner"

  const handleCreateColumn = (content: string) => {
    createNewColumn(content)
    setCreateColumnOpen(false)
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-3 px-3 pt-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SearchInput
                  value={searchValue}
                  onChange={onSearchChange}
                  disabled={tasks.length === 0}
                />
              </div>
            </TooltipTrigger>
            {tasks.length === 0 && (
              <TooltipContent>Crea una tarea para empezar a filtrar</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {isOwner && (
          <Button
            onClick={() => setCreateColumnOpen(true)}
            className="group hover:border-primary hover:bg-primary/5 hover:text-primary border-2 border-dashed transition-all"
            variant="outline"
            disabled={columns.length >= 6}
          >
            <IconPlus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            Agregar Columna
          </Button>
        )}
      </div>

      {isOwner && (
        <CreateColumnSheet
          open={createColumnOpen}
          onOpenChange={setCreateColumnOpen}
          onSave={handleCreateColumn}
        />
      )}
    </>
  )
}
