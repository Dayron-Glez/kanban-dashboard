import { COLUMN_CATEGORIES, type Column, type ColumnCategory } from "@repo/contracts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/index"
import { useSetColumnCategory } from "@/features/board/index"
import { CATEGORY_CONFIG } from "../lib/columnCategories"

interface ColumnCategoryMenuProps {
  column: Column
  isOwner: boolean
}

function CategoryDot({ category }: Readonly<{ category: ColumnCategory }>) {
  return (
    <span
      className="block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: CATEGORY_CONFIG[category].color }}
    />
  )
}

export function ColumnCategoryMenu({ column, isOwner }: Readonly<ColumnCategoryMenuProps>) {
  const setCategory = useSetColumnCategory(column.projectId)
  const { label } = CATEGORY_CONFIG[column.category]

  if (!isOwner) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span aria-label={`Categoría: ${label}`}>
            <CategoryDot category={column.category} />
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            aria-label={`Categoría: ${label}. Cambiar categoría`}
            onClick={(e) => e.stopPropagation()}
            className="hover:bg-muted shrink-0 cursor-pointer rounded-full p-1 transition-colors"
          >
            <CategoryDot category={column.category} />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Categoría</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={column.category}
          onValueChange={(value) =>
            setCategory.mutate({ id: column.id, category: value as ColumnCategory })
          }
        >
          {COLUMN_CATEGORIES.map((category) => (
            <DropdownMenuRadioItem key={category} value={category} className="gap-2">
              <CategoryDot category={category} />
              {CATEGORY_CONFIG[category].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
