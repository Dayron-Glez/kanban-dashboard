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
  useSidebar,
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
 * Control del sidebar al pie, como el de Supabase: un menú para elegir entre
 * expandido, contraído o expandir al pasar el cursor.
 */
export function SidebarControlFooter({ mode, onModeChange }: Props) {
  const { open } = useSidebar()

  return (
    <SidebarFooter className="bg-card border-border border-t pt-2 pb-2">
      <div className={open ? "px-2" : "flex justify-center"}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {open ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground w-full justify-start gap-2 text-[11.5px] font-semibold"
              >
                <IconLayoutSidebar size={15} />
                Control del sidebar
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0"
                title="Control del sidebar"
              >
                <IconLayoutSidebar size={15} />
              </Button>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-56">
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
