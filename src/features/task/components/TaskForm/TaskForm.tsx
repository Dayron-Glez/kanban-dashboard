import { ContentTextArea } from "./ContentTextArea";
import { PrioritySelect } from "./PrioritySelect";
import { SizeSelect } from "./SizeSelect";

interface TaskFormProps {
  disabled?: boolean;
}

export function TaskForm({ disabled = false }: TaskFormProps) {
  return (
    <div className="grid grid-cols-2 gap-4 px-2">
      <div className="col-span-2">
        <ContentTextArea disabled={disabled} />
      </div>
      <PrioritySelect disabled={disabled} />
      <SizeSelect disabled={disabled} />
    </div>
  );
}
