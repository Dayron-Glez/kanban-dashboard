import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type z from "zod";
import { columnValidationSchema, Field, Input } from "@/index";

interface EditableColumnTitleProps {
  title: string;
  onSave: (newTitle: string) => void;
  onCancel: () => void;
}

export function EditableColumnTitle({
  title,
  onSave,
  onCancel,
}: EditableColumnTitleProps) {
  const form = useForm<z.infer<typeof columnValidationSchema>>({
    resolver: zodResolver(columnValidationSchema),
    defaultValues: {
      title: title,
    },
  });

  const handleBlur = async (): Promise<void> => {
    const isValid = await form.trigger();
    if (isValid) {
      const { title: newTitle } = form.getValues();
      onSave(newTitle);
    } else {
      // Si hay error, restaurar el valor original
      form.reset({ title: title });
      onCancel();
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const isValid = await form.trigger();
      if (isValid) {
        const { title: newTitle } = form.getValues();
        onSave(newTitle);
      }
    }
    if (e.key === "Escape") {
      form.reset({ title: title });
      onCancel();
    }
  };

  const error = form.formState.errors.title;

  return (
    <Field data-invalid={!!error}>
      <Input
        {...form.register("title")}
        className="flex-1 h-9 focus-visible:ring-primary focus-visible:ring-1"
        placeholder="Nombre de la columna"
        autoFocus
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </Field>
  );
}
