import { IconSearch } from "@tabler/icons-react"
import { Field, InputGroup, InputGroupInput, InputGroupAddon } from "@/shared/index"
interface SearchInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Clases extra para el InputGroup (p. ej. altura compacta en el navbar). */
  className?: string
}

export function SearchInput({
  value,
  placeholder,
  onChange,
  disabled = false,
  className,
}: SearchInputProps) {
  return (
    <Field orientation="horizontal" className={disabled ? "cursor-not-allowed" : ""}>
      <InputGroup className={className}>
        <InputGroupInput
          disabled={disabled}
          className="min-w-56"
          type="search"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder?.trim().length ? placeholder : "Buscar tarea por contenido"}
        />
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
