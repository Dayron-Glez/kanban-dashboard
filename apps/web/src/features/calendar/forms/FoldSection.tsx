import { useState, type ReactNode } from "react"
import { IconChevronDown, type Icon } from "@tabler/icons-react"
import { cn, Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/index"

interface FoldSectionProps {
  icon: Icon
  title: string
  /** Lo que lleva dentro, en una línea: se ve con la sección plegada. */
  summary: string
  defaultOpen?: boolean
  /** Con un error dentro se abre, para que se vea. */
  invalid?: boolean
  /** Con cambios sin guardar dentro: la marca cian. */
  changed?: boolean
  children: ReactNode
}

/** Una sección del formulario que se pliega, con su resumen a la derecha. */
export function FoldSection({
  icon: SectionIcon,
  title,
  summary,
  defaultOpen = false,
  invalid = false,
  changed = false,
  children,
}: Readonly<FoldSectionProps>) {
  const [open, setOpen] = useState<boolean>(defaultOpen)
  const shown = open || invalid
  return (
    <Collapsible
      open={shown}
      onOpenChange={setOpen}
      className={cn("border-border rounded-xl border", invalid && "border-destructive/50")}
    >
      <CollapsibleTrigger className="hover:bg-muted/40 flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left">
        <SectionIcon size={16} className="text-muted-foreground shrink-0" aria-hidden />
        <span className="text-base font-semibold">{title}</span>
        {changed && (
          <span aria-label="Con cambios sin guardar" className="bg-primary size-1.5 rounded-full" />
        )}
        {!shown && (
          <span className="text-muted-foreground ml-auto max-w-[55%] truncate text-sm">
            {summary}
          </span>
        )}
        <IconChevronDown
          size={16}
          aria-hidden
          className={cn(
            "text-muted-foreground shrink-0 transition-transform",
            shown ? "ml-auto rotate-180" : !summary && "ml-auto"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 px-3 pt-1 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
