import { Field } from "@/components/ui/field";

import { IconSearch } from "@tabler/icons-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({
  value,
  placeholder,
  onChange,
}: SearchInputProps) {
  return (
    <Field orientation="horizontal">
      <InputGroup>
        <InputGroupInput
          className=" min-w-56"
          type="search"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
          placeholder={
            placeholder?.trim().length
              ? placeholder
              : "Buscar tarea por contenido"
          }
        />
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
