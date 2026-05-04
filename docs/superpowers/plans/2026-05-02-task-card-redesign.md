# Task Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la TaskCard al estilo GitHub (título + menú siempre visible arriba, badges con colores por prioridad/tamaño, avatar abajo-derecha con tooltip nombre+email) y añadir email en el selector de asignado.

**Architecture:** Se extrae un archivo `taskChips.ts` con la configuración de colores compartida entre `TaskCard`, `PrioritySelect` y `SizeSelect`. Se actualiza el tipo `assigneeProfile` en `board.types.ts` para incluir `email`. Los selects de prioridad y tamaño renderizan chips de colores en cada opción.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Tooltip, DropdownMenu, Card), @dnd-kit/sortable.

---

## Archivos

| Acción    | Ruta                                                       |
| --------- | ---------------------------------------------------------- |
| Crear     | `src/features/task/components/taskChips.ts`                |
| Modificar | `src/features/board/types/board.types.ts`                  |
| Modificar | `src/features/task/components/TaskCard.tsx`                |
| Modificar | `src/features/task/components/TaskForm/PrioritySelect.tsx` |
| Modificar | `src/features/task/components/TaskForm/SizeSelect.tsx`     |
| Modificar | `src/features/task/components/TaskForm/AssigneeSelect.tsx` |

---

## Task 1: Configuración de colores compartida

**Files:**

- Create: `src/features/task/components/taskChips.ts`

- [ ] **Step 1: Crear el archivo de configuración**

```typescript
// src/features/task/components/taskChips.ts
import type { TaskPriority, TaskSize } from "@/features/board/types/board.types"

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  p0: { label: "P0", className: "bg-red-100 text-red-600" },
  p1: { label: "P1", className: "bg-orange-100 text-orange-600" },
  p2: { label: "P2", className: "bg-blue-100 text-blue-600" },
}

export const SIZE_CONFIG: Record<TaskSize, { label: string; className: string }> = {
  xs: { label: "XS", className: "bg-green-50 text-green-600" },
  s: { label: "S", className: "bg-emerald-50 text-emerald-600" },
  m: { label: "M", className: "bg-blue-50 text-blue-500" },
  l: { label: "L", className: "bg-violet-50 text-violet-600" },
  xl: { label: "XL", className: "bg-orange-50 text-orange-500" },
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd D:/Dayron/Proyectos/React/kanban-dashboard && npx tsc --noEmit -p tsconfig.app.json
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/task/components/taskChips.ts
git commit -m "feat(task): añadir configuración de colores para prioridad y tamaño"
```

---

## Task 2: Actualizar tipo assigneeProfile para incluir email

**Files:**

- Modify: `src/features/board/types/board.types.ts` (línea 16)

- [ ] **Step 1: Actualizar la interfaz Task**

Localizar en `src/features/board/types/board.types.ts`:

```typescript
// ANTES
assigneeProfile: { full_name: string | null; avatar_url: string | null } | null

// DESPUÉS
assigneeProfile: { full_name: string | null; avatar_url: string | null; email: string | null } | null
```

El campo `email` ya llega desde la query de `KanbanContext.tsx` (que selecciona `email` en `fetchProfiles`), por lo que no hay cambio de datos, solo de tipo.

- [ ] **Step 2: Verificar TypeScript**

```bash
cd D:/Dayron/Proyectos/React/kanban-dashboard && npx tsc --noEmit -p tsconfig.app.json
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/board/types/board.types.ts
git commit -m "feat(task): añadir email al tipo assigneeProfile"
```

---

## Task 3: Rediseño completo de TaskCard

**Files:**

- Modify: `src/features/task/components/TaskCard.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```tsx
// src/features/task/components/TaskCard.tsx
import { useState } from "react"
import { IconDots, IconTrash, IconEye, IconEdit } from "@tabler/icons-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Button,
} from "@/shared/index"
import { type Task } from "@/features/board/index"
import { type TaskFormValues } from "../schemas/task.schema"
import { DetailsTaskSheet } from "./DetailsTaskSheet"
import { EditTaskSheet } from "./EditTaskSheet"
import { PRIORITY_CONFIG, SIZE_CONFIG } from "./taskChips"

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface Props {
  task: Task
  deleteTask: (id: string) => void
  updateTask: (id: string, taskData: TaskFormValues) => void
}

export function TaskCard({ task, deleteTask, updateTask }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  })

  const style = { transition, transform: CSS.Transform.toString(transform) }

  const priority = PRIORITY_CONFIG[task.priority]
  const size = SIZE_CONFIG[task.size]

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="border-border bg-muted/50 my-2 min-h-[72px] rounded-lg border border-dashed opacity-60"
      />
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-card border-border hover:border-muted-foreground/30 my-2 flex cursor-grab flex-col gap-2 rounded-lg border p-3 shadow-sm transition-all hover:shadow-md"
      >
        {/* Fila superior: título + menú */}
        <div className="flex items-start gap-2">
          <span className="text-foreground line-clamp-2 flex-1 text-sm font-medium leading-snug">
            {task.content}
          </span>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted mt-0.5 shrink-0"
                aria-label="Abrir menú de acciones"
              >
                <IconDots size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
                  <IconEye size={14} />
                  Ver Detalles
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <IconEdit size={14} />
                  Editar Tarea
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteDialogOpen(true)}>
                  <IconTrash size={14} />
                  Eliminar Tarea
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Fila inferior: badges + avatar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority.className}`}
            >
              {priority.label}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${size.className}`}
            >
              {size.label}
            </span>
          </div>

          {task.assigneeProfile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-6 w-6 shrink-0 cursor-default items-center justify-center rounded-full border border-white bg-violet-100 text-[9px] font-bold text-violet-600 shadow-sm">
                    {getInitials(task.assigneeProfile.full_name)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {task.assigneeProfile.full_name ?? "Sin nombre"}
                  </span>
                  {task.assigneeProfile.email && (
                    <span className="text-xs opacity-75">{task.assigneeProfile.email}</span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <DetailsTaskSheet task={task} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <EditTaskSheet task={task} onSave={updateTask} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar Tarea?</AlertDialogTitle>
          <AlertDialogHeader>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La tarea será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTask(task.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd D:/Dayron/Proyectos/React/kanban-dashboard && npx tsc --noEmit -p tsconfig.app.json
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/task/components/TaskCard.tsx
git commit -m "feat(task): rediseñar TaskCard al estilo GitHub"
```

---

## Task 4: Chips de colores en PrioritySelect

**Files:**

- Modify: `src/features/task/components/TaskForm/PrioritySelect.tsx`

- [ ] **Step 1: Actualizar el componente**

```tsx
// src/features/task/components/TaskForm/PrioritySelect.tsx
import { useFormContext, Controller } from "react-hook-form"
import {
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/index"
import { TASK_PRIORITIES } from "@/features/board/types/board.types"
import { PRIORITY_CONFIG } from "../taskChips"

interface SelectPriorityProps {
  disabled?: boolean
}

export function PrioritySelect({ disabled = false }: SelectPriorityProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  return (
    <Controller
      name="priority"
      control={control}
      render={({ field }) => (
        <Field data-invalid={!!errors.priority}>
          <FieldLabel htmlFor="priority" className="text-primary">
            Prioridad
          </FieldLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger id="priority" disabled={disabled}>
              <SelectValue placeholder="Selecciona una prioridad" />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((priority) => {
                const cfg = PRIORITY_CONFIG[priority]
                return (
                  <SelectItem key={priority} value={priority}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.className}`}
                    >
                      {cfg.label}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {errors.priority && <FieldError errors={[errors.priority]} />}
        </Field>
      )}
    />
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd D:/Dayron/Proyectos/React/kanban-dashboard && npx tsc --noEmit -p tsconfig.app.json
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/task/components/TaskForm/PrioritySelect.tsx
git commit -m "feat(task): chips de colores en selector de prioridad"
```

---

## Task 5: Chips de colores en SizeSelect

**Files:**

- Modify: `src/features/task/components/TaskForm/SizeSelect.tsx`

- [ ] **Step 1: Actualizar el componente**

```tsx
// src/features/task/components/TaskForm/SizeSelect.tsx
import { useFormContext, Controller } from "react-hook-form"
import {
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/index"
import { TASK_SIZES } from "@/features/board/types/board.types"
import { SIZE_CONFIG } from "../taskChips"

interface SelectSizeProps {
  disabled?: boolean
}

export function SizeSelect({ disabled = false }: SelectSizeProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  return (
    <Controller
      name="size"
      control={control}
      render={({ field }) => (
        <Field data-invalid={!!errors.size}>
          <FieldLabel htmlFor="size" className="text-primary">
            Tamaño
          </FieldLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger id="size" disabled={disabled}>
              <SelectValue placeholder="Selecciona un tamaño" />
            </SelectTrigger>
            <SelectContent>
              {TASK_SIZES.map((size) => {
                const cfg = SIZE_CONFIG[size]
                return (
                  <SelectItem key={size} value={size}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.className}`}
                    >
                      {cfg.label}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {errors.size && <FieldError errors={[errors.size]} />}
        </Field>
      )}
    />
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd D:/Dayron/Proyectos/React/kanban-dashboard && npx tsc --noEmit -p tsconfig.app.json
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/task/components/TaskForm/SizeSelect.tsx
git commit -m "feat(task): chips de colores en selector de tamaño"
```

---

## Task 6: Email en AssigneeSelect

**Files:**

- Modify: `src/features/task/components/TaskForm/AssigneeSelect.tsx`

- [ ] **Step 1: Actualizar el componente para mostrar email**

```tsx
// src/features/task/components/TaskForm/AssigneeSelect.tsx
import { useFormContext, Controller } from "react-hook-form"
import {
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/index"
import { useKanban } from "@/features/board/index"

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface AssigneeSelectProps {
  disabled?: boolean
}

export function AssigneeSelect({ disabled = false }: AssigneeSelectProps) {
  const { control } = useFormContext()
  const { members } = useKanban()

  return (
    <Controller
      name="assignee_id"
      control={control}
      render={({ field }) => (
        <Field className="col-span-2">
          <FieldLabel htmlFor="assignee_id" className="text-primary">
            Asignado a
          </FieldLabel>
          <Select
            value={field.value ?? "none"}
            onValueChange={(val) => field.onChange(val === "none" ? null : val)}
            disabled={disabled}
          >
            <SelectTrigger id="assignee_id" disabled={disabled}>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-600">
                      {getInitials(m.profiles?.full_name)}
                    </span>
                    <div className="flex flex-col gap-0">
                      <span className="text-sm leading-tight">
                        {m.profiles?.full_name ?? m.user_id.slice(0, 8)}
                      </span>
                      {m.profiles?.email && (
                        <span className="text-muted-foreground text-[10px] leading-tight">
                          {m.profiles.email}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd D:/Dayron/Proyectos/React/kanban-dashboard && npx tsc --noEmit -p tsconfig.app.json
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/task/components/TaskForm/AssigneeSelect.tsx
git commit -m "feat(task): mostrar email en selector de asignado"
```
