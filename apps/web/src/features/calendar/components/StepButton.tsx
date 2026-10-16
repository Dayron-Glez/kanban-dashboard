import type { ReactNode } from "react"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"

// Un botón de la cabecera con su Tooltip y su atajo.
export function StepButton({
  label,
  shortcut,
  onClick,
  children,
}: Readonly<{ label: string; shortcut: string; onClick?: () => void; children: ReactNode }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={!onClick}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label} <kbd className="ml-1 opacity-70">{shortcut}</kbd>
      </TooltipContent>
    </Tooltip>
  )
}
