import { IconCheck, IconLayoutSidebar } from "@tabler/icons-react"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarFooter,
} from "@/shared"

export type SidebarMode = "expanded" | "collapsed" | "hover"

const MODE_OPTIONS: { value: SidebarMode; label: string }[] = [
  { value: "expanded", label: "Expandido" },
  { value: "collapsed", label: "Contraído" },
  { value: "hover", label: "Expandir al pasar el cursor" },
]

interface Props {
  mode: SidebarMode
  onModeChange: (mode: SidebarMode) => void
}

/**
 * Control del sidebar al pie, como el de Supabase: un icono fijo en la esquina
 * —siempre en la misma posición, esté el sidebar como esté— que abre el menú
 * para elegir entre expandido, contraído o expandir al pasar el cursor.
 */
export function SidebarControlFooter({ mode, onModeChange }: Props) {
  return (
    <SidebarFooter className="bg-card border-border border-t px-0 py-2">
      {/* Slot del ancho del rail, sin el p-2 por defecto del footer: así el
          botón queda centrado exactamente sobre los iconos del rail y no se
          mueve al expandir/contraer. */}
      <div className="flex w-(--sidebar-width-icon) justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0"
              title="Control del sidebar"
            >
              <IconLayoutSidebar size={15} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56"
            // Radix devuelve el foco al disparador al cerrar y eso pintaba el
            // focus ring global tras cada click de ratón.
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuLabel className="text-muted-foreground text-[11px] font-bold tracking-wide uppercase">
              Control del sidebar
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MODE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => onModeChange(option.value)}
                className="text-[12.5px]"
              >
                <span className="flex-1">{option.label}</span>
                {mode === option.value && (
                  <span data-testid={`modo-activo-${option.value}`} className="text-primary">
                    <IconCheck size={14} />
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SidebarFooter>
  )
}
