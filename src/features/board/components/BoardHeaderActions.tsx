import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button, SearchInput, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"
import { CreateColumnSheet } from "@/features/column/index"
import { useKanban } from "../hooks/useKanban"

interface Props {
  searchValue: string
  onSearchChange: (value: string) => void
}

/**
 * Acciones del tablero que van en el slot derecho del Header: filtro de
 * tareas y creación de columnas. Viven aquí y no en el Header compartido
 * para que este no dependa de useKanban y pueda montarse fuera del
 * KanbanProvider (p. ej. en /projects).
 */
export function BoardHeaderActions({ searchValue, onSearchChange }: Props) {
  const { createNewColumn, columns, tasks, userRole } = useKanban()
  const [createColumnOpen, setCreateColumnOpen] = useState<boolean>(false)

  const isOwner = userRole === "owner"

  const handleCreateColumn = (content: string) => {
    createNewColumn(content)
    setCreateColumnOpen(false)
  }

  return (
    <>
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
