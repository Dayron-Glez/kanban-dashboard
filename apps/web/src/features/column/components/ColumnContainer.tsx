import { IconChevronDown, IconPlus, IconTrash, IconTrashOff } from "@tabler/icons-react"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { useCallback, useContext, useRef, useState } from "react"
import { createPortal, flushSync } from "react-dom"
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/utils/combine"
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/utils/pointer-outside-of-preview"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/utils/set-custom-native-drag-preview"
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element"
import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge/attach-closest-edge"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge/extract-closest-edge"
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  SearchContext,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/index"
import {
  columnDragData,
  isColumnDragData,
  isTaskDragData,
  useCreateTask,
  useDeleteColumn,
  useDeleteTask,
  useRenameColumn,
  useUpdateTask,
  type BoardTask,
  type TaskDraft,
} from "@/features/board/index"
import { useProject } from "@/features/project"
import { ColumnDragPreview } from "./ColumnDragPreview"
import { ColumnDropIndicator } from "./ColumnDropIndicator"
import { EditableColumnTitle } from "./EditableColumnTitle/EditableColumnTitle"
import { CreateTaskSheet, TaskCard } from "@/features/task/index"
import type { Column } from "@repo/contracts"

const COLUMN_ACCENTS = ["#6366f1", "#f97316", "#0ea5e9", "#10b981", "#ec4899", "#8b5cf6"]
const getAccent = (position: number) => COLUMN_ACCENTS[position % COLUMN_ACCENTS.length]

interface Props {
  column: Column
  tasks: BoardTask[]
  hasFilteredTasks?: boolean
}

function EmptyZone({ onAdd }: Readonly<{ onAdd: () => void }>) {
  return (
    <button
      onClick={onAdd}
      className="group border-border hover:border-primary text-muted-foreground hover:text-primary hover:bg-primary/5 my-1 flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed bg-transparent py-5 transition-all"
    >
      <div className="bg-muted group-hover:bg-primary text-muted-foreground group-hover:text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full transition-all">
        <IconPlus size={12} />
      </div>
      <span className="text-xs font-medium">Agregar primera tarea</span>
    </button>
  )
}

export function ColumnContainer({ column, tasks, hasFilteredTasks = false }: Readonly<Props>) {
  const projectId = column.projectId
  const isOwner = useProject(projectId).data?.role === "owner"
  const renameColumn = useRenameColumn(projectId)
  const removeColumn = useDeleteColumn(projectId)
  const createTask = useCreateTask(projectId)
  const editTask = useUpdateTask(projectId)
  const removeTask = useDeleteTask(projectId)

  const createNewTask = (columnId: string, draft: TaskDraft) =>
    createTask.mutate({ columnId, draft })
  const updateTask = (id: string, draft: TaskDraft) => editTask.mutate({ id, draft })
  const deleteTask = (id: string) => removeTask.mutate(id)

  const searchContext = useContext(SearchContext)
  const searchValue = searchContext?.searchValue ?? ""

  const [editMode, setEditMode] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false)

  // Las tareas se muestran en el orden manual persistido, sin ordenar por
  // prioridad: ordenar aquí creaba una segunda fuente de verdad para el mismo
  // orden, así que al soltar una tarea saltaba a otro sitio y lo que se
  // guardaba no era lo que se veía. La urgencia se comunica con el punto rojo
  // de la cabecera y la etiqueta de cada tarjeta.
  const [tasksRef] = useAutoAnimate()

  const accent = getAccent(column.position)
  const p0Count = tasks.filter((t) => t.priority === "p0").length
  const progressWidth = Math.min((tasks.length / 5) * 100, 100)

  const handleRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dropEdge, setDropEdge] = useState<Edge | null>(null)
  const [isTaskOver, setIsTaskOver] = useState<boolean>(false)
  const [previewContainer, setPreviewContainer] = useState<HTMLElement | null>(null)

  // Una columna hace tres papeles: se arrastra por la cabecera, recibe otras
  // columnas a su izquierda o derecha, y recibe tareas, que van al final.
  // Plegada no tiene cabecera, así que solo quedan los dos últimos.
  //
  // Ref callback y no efecto: el registro sigue al elemento. Al plegar o
  // desplegar cambia el elemento (por eso cada versión lleva su `key`) y React
  // limpia el registro viejo y crea el nuevo sin que nadie se lo pida. La
  // cabecera ya está en handleRef cuando esto se ejecuta: React asigna las refs
  // de los hijos antes que las del padre.
  const columnRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return

      const cleanups = [
        dropTargetForElements({
          element,
          canDrop: ({ source }) =>
            isTaskDragData(source.data) ||
            (isColumnDragData(source.data) && source.data.columnId !== column.id),
          getData: ({ input, source }) => {
            const data = columnDragData(column.id)
            return isColumnDragData(source.data)
              ? attachClosestEdge(data, { element, input, allowedEdges: ["left", "right"] })
              : data
          },
          onDrag: ({ self, source, location }) => {
            setDropEdge(isColumnDragData(source.data) ? extractClosestEdge(self.data) : null)
            // Solo se resalta si la tarea está sobre la columna y no sobre una de
            // sus tarjetas: ahí manda la línea de la tarjeta.
            setIsTaskOver(
              isTaskDragData(source.data) && location.current.dropTargets[0]?.element === element
            )
          },
          onDragLeave: () => {
            setDropEdge(null)
            setIsTaskOver(false)
          },
          onDrop: () => {
            setDropEdge(null)
            setIsTaskOver(false)
          },
        }),
      ]

      const handle = handleRef.current
      if (handle) {
        cleanups.push(
          draggable({
            element,
            dragHandle: handle,
            canDrag: () => !editMode,
            getInitialData: () => columnDragData(column.id),
            onGenerateDragPreview: ({ nativeSetDragImage }) => {
              setCustomNativeDragPreview({
                nativeSetDragImage,
                getOffset: pointerOutsideOfPreview({ x: "16px", y: "8px" }),
                render: ({ container }) => {
                  // El navegador fotografía el contenedor nada más terminar este
                  // evento. flushSync obliga a React a pintar la vista previa ya,
                  // en vez de dejarla para el siguiente ciclo y capturarlo vacío.
                  flushSync(() => setPreviewContainer(container))
                  return () => setPreviewContainer(null)
                },
              })
            },
            onDragStart: () => setIsDragging(true),
            onDrop: () => setIsDragging(false),
          })
        )
      }

      return combine(...cleanups)
    },
    [column.id, editMode]
  )

  // El autoscroll pertenece al viewport de la lista, no a la columna: con su
  // propio ref callback aparece y desaparece con ella al desplegar y plegar.
  const autoScrollRef = useCallback(
    (element: HTMLDivElement | null) => (element ? autoScrollForElements({ element }) : undefined),
    []
  )

  const dropIndicator = dropEdge && <ColumnDropIndicator edge={dropEdge} />

  // ── Collapsed: slim vertical pill ─────────────────────────────────────────
  if (collapsed) {
    return (
      <>
        <div
          key="plegada"
          ref={columnRef}
          className="relative flex max-h-full w-10 shrink-0 flex-col"
        >
          {dropIndicator}
          <div
            onClick={() => setCollapsed(false)}
            title={`${column.title} (${tasks.length} tareas)`}
            className={`bg-card border-border flex min-h-0 cursor-pointer flex-col items-center gap-2.5 overflow-hidden rounded-[14px] border pt-3.5 pb-3.5 shadow-sm ${
              searchValue.trim().length > 0 && !hasFilteredTasks ? "opacity-35" : ""
            } ${isTaskOver ? "ring-primary/40 ring-2" : ""}`}
          >
            {/* Accent dot */}
            <div className="h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} />

            {/* Rotated title */}
            <span
              className="text-muted-foreground flex-1 overflow-hidden text-[11.5px] font-bold whitespace-nowrap"
              style={{
                writingMode: "vertical-lr",
                textOrientation: "mixed",
                transform: "rotate(180deg)",
                letterSpacing: "0.04em",
                textOverflow: "ellipsis",
                maxHeight: 120,
              }}
            >
              {column.title}
            </span>

            {/* Task count badge */}
            <div
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
              style={{ background: accent }}
            >
              {tasks.length}
            </div>

            {/* P0 urgent dot */}
            {p0Count > 0 && (
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: "#ef4444",
                  boxShadow: "0 0 0 2px rgba(239,68,68,0.2)",
                }}
              />
            )}
          </div>
        </div>

        <CreateTaskSheet
          columnId={column.id}
          open={createTaskDialogOpen}
          onOpenChange={setCreateTaskDialogOpen}
          onSave={createNewTask}
        />
      </>
    )
  }

  return (
    <>
      {/* El envoltorio no recorta (la columna sí, por sus esquinas
          redondeadas), así que el indicador puede salir al hueco entre
          columnas. Es también el elemento que se arrastra y el que recibe. */}
      <div
        key="expandida"
        ref={columnRef}
        className="relative flex max-h-full max-w-[380px] min-w-[220px] flex-1 basis-0 flex-col"
      >
        {dropIndicator}
        {/* Mientras se arrastra, la columna conserva su tamaño pero se oculta
            y en su lugar queda un hueco: se ve de dónde sale y que ya no está. */}
        {isDragging && (
          <div className="border-primary/50 bg-primary/5 pointer-events-none absolute inset-0 rounded-[14px] border-2 border-dashed" />
        )}
        <div
          className={`bg-card border-border grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-[14px] border shadow-sm ${
            hasFilteredTasks ? "ring-primary ring-2" : isTaskOver ? "ring-primary/40 ring-2" : ""
          } ${searchValue.trim().length > 0 && !hasFilteredTasks ? "opacity-35" : ""} ${
            isDragging ? "invisible" : ""
          }`}
        >
          <div>
            <div
              ref={handleRef}
              className="bg-card border-border flex cursor-grab items-center gap-2 border-b px-3.5 py-3 active:cursor-grabbing"
            >
              {/* Color dot */}
              <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />

              {!editMode && (
                <span
                  onClick={(e) => {
                    if (!isOwner) return
                    e.stopPropagation()
                    setEditMode(true)
                  }}
                  className={`text-foreground flex-1 truncate text-[13px] font-bold ${
                    isOwner ? "hover:text-primary cursor-pointer" : "cursor-default"
                  }`}
                >
                  {column.title}
                </span>
              )}

              {editMode && isOwner && (
                <EditableColumnTitle
                  title={column.title}
                  onSave={(newTitle) => {
                    renameColumn.mutate({ id: column.id, title: newTitle })
                    setEditMode(false)
                  }}
                  onCancel={() => setEditMode(false)}
                />
              )}

              {/* P0 urgency dot */}
              {p0Count > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: "#ef4444",
                        boxShadow: "0 0 0 2px rgba(239,68,68,0.2)",
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {p0Count} tarea{p0Count > 1 ? "s" : ""} urgente{p0Count > 1 ? "s" : ""}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Task count pill */}
              <div className="bg-primary text-primary-foreground flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-center text-[11px] font-bold">
                {tasks.length}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCollapsed(true)
                    }}
                    aria-label="Colapsar columna"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded-md p-1 transition-colors"
                  >
                    <IconChevronDown size={14} className="rotate-90" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Colapsar columna</TooltipContent>
              </Tooltip>

              {/* Delete column button (owner only) */}
              {isOwner && (
                <AlertDialog>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            disabled={tasks.length > 0 || searchValue.trim().length > 0}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-md p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            {tasks.length > 0 || searchValue.trim().length > 0 ? (
                              <IconTrashOff size={14} />
                            ) : (
                              <IconTrash size={14} />
                            )}
                          </button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Eliminar Columna</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <AlertDialogContent>
                    <AlertDialogTitle>¿ Eliminar Columna ?</AlertDialogTitle>
                    <AlertDialogHeader>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. La columna y todas sus tareas serán
                        eliminadas permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/60"
                        onClick={() => removeColumn.mutate(column.id)}
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {tasks.length > 0 && (
              <div className="bg-border h-[3px]">
                <div
                  className="h-full transition-[width] duration-300 ease-out"
                  style={{
                    width: `${progressWidth}%`,
                    background: accent,
                    opacity: 0.6,
                  }}
                />
              </div>
            )}
          </div>

          <ScrollArea viewportRef={autoScrollRef} className="h-full min-h-0">
            {/* Sin gap entre tarjetas: el espacio lo pone el padding de cada una,
              para que sus zonas de soltado sean contiguas. */}
            <div ref={tasksRef} className="flex flex-col px-2.5 py-1.5">
              {tasks.length === 0 ? (
                <EmptyZone onAdd={() => setCreateTaskDialogOpen(true)} />
              ) : (
                tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    updateTask={updateTask}
                    deleteTask={deleteTask}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {tasks.length > 0 && (
            <div className="px-2.5 pb-2.5">
              {searchValue.trim().length > 0 ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full cursor-not-allowed">
                        <button
                          disabled
                          className="border-border text-muted-foreground flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-dashed bg-transparent py-2 text-[12.5px] font-medium opacity-40"
                        >
                          <IconPlus size={12} />
                          Agregar Tarea
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="z-50">
                      Limpia el filtro para crear una tarea
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <button
                  onClick={() => setCreateTaskDialogOpen(true)}
                  className="border-border hover:border-primary text-muted-foreground hover:text-primary hover:bg-primary/5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-dashed bg-transparent py-2 text-[12.5px] font-medium transition-all"
                >
                  <IconPlus size={12} />
                  Agregar Tarea
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {previewContainer &&
        createPortal(
          <ColumnDragPreview title={column.title} accent={accent} tasks={tasks} />,
          previewContainer
        )}

      <CreateTaskSheet
        columnId={column.id}
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
        onSave={createNewTask}
      />
    </>
  )
}
