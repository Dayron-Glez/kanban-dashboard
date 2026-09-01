import { IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react"
import { Button, SidebarFooter, useSidebar } from "@/shared"

/**
 * Pie del sidebar. Solo el control de colapsar: la cuenta vive ahora al final
 * de la barra superior, como en Supabase.
 */
export function SidebarCollapseFooter() {
  const { open, toggleSidebar } = useSidebar()

  if (!open) {
    return (
      <SidebarFooter className="bg-card border-border border-t pt-2 pb-2">
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0"
            onClick={toggleSidebar}
            title="Expandir sidebar"
          >
            <IconChevronsRight size={14} />
          </Button>
        </div>
      </SidebarFooter>
    )
  }

  return (
    <SidebarFooter className="bg-card border-border border-t pt-2 pb-2">
      <div className="px-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-full justify-start gap-1 text-[11.5px] font-semibold"
          onClick={toggleSidebar}
        >
          <IconChevronsLeft size={14} />
          Colapsar
        </Button>
      </div>
    </SidebarFooter>
  )
}
