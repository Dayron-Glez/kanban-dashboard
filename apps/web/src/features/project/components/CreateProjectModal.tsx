import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PROJECT_KINDS } from "@repo/contracts"
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { PROJECT_KIND_LABELS } from "../lib/projectKinds"
import { projectSchema, PROJECT_COLORS, type ProjectFormValues } from "../schemas/project.schema"

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ProjectFormValues) => Promise<void>
}

export function CreateProjectModal({ open, onOpenChange, onSubmit }: CreateProjectModalProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { kind: "film", color: PROJECT_COLORS[0] },
  })

  const selectedColor = useWatch({ control, name: "color" })

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const handleFormSubmit = async (values: ProjectFormValues) => {
    try {
      await onSubmit(values)
      handleClose()
    } catch {
      // El toast ya avisa; el diálogo sigue abierto para reintentar sin reescribir.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-2 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Mi proyecto" {...register("name")} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="kind">Tipo</Label>
            <Controller
              name="kind"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {PROJECT_KIND_LABELS[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              placeholder="¿De qué trata este proyecto?"
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("color", color)}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    outline: selectedColor === color ? `2px solid ${color}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear proyecto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
