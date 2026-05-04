import { useState } from "react"
import { IconPlus, IconSun, IconMoon } from "@tabler/icons-react"
import {
  Button,
  SearchInput,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTheme,
} from "@/shared/index"
import { useKanban } from "@/features/board/index"
import { CreateColumnSheet } from "@/features/column/index"

interface HeaderProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  projectName?: string
}

export function Header({ searchValue, onSearchChange, projectName }: HeaderProps) {
  const { createNewColumn, columns, tasks, userRole } = useKanban()
  const { theme, toggleTheme } = useTheme()
  const [createColumnDialogOpen, setCreateColumnDialogOpen] = useState<boolean>(false)

  const isOwner = userRole === "owner"

  const handleCreateColumn = (content: string) => {
    createNewColumn(content)
    setCreateColumnDialogOpen(false)
  }

  return (
    <>
      <header className="bg-background flex h-16 shrink-0 items-center justify-between gap-4 border-b border-b-transparent px-6 shadow-md">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-primary" />
          <h1 className="text-primary flex items-center gap-2 text-xl font-semibold">
            Kanban Dashboard
            {projectName && (
              <>
                <span className="text-muted-foreground font-normal">|</span>
                <span className="text-lg font-extralight">{projectName}</span>
              </>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
          </Button>
          {onSearchChange && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <SearchInput
                        value={searchValue ?? ""}
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
                  onClick={() => setCreateColumnDialogOpen(true)}
                  className="group hover:border-primary hover:bg-primary/5 hover:text-primary border-2 border-dashed transition-all"
                  variant="outline"
                  disabled={columns.length >= 6}
                >
                  <IconPlus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  Agregar Columna
                </Button>
              )}
            </>
          )}
        </div>
      </header>
      {onSearchChange && isOwner && (
        <CreateColumnSheet
          open={createColumnDialogOpen}
          onOpenChange={setCreateColumnDialogOpen}
          onSave={handleCreateColumn}
        />
      )}
    </>
  )
}
