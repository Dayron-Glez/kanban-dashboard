import { Content, Priority, Size } from "@/index";

interface TaskFormProps {
  disabled?: boolean;
}

export function TaskForm({ disabled = false }: TaskFormProps) {
  return (
    <div className="grid grid-cols-2 gap-4 px-2">
      <div className="col-span-2">
        <Content disabled={disabled} />
      </div>
      <Priority disabled={disabled} />
      <Size disabled={disabled} />
    </div>
  );
}
