// Header.tsx
import { SidebarTrigger } from "@/components/ui/sidebar";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useKanban } from "@/context/KanbanContext";

export default function Header() {
  const { createNewColumn, columns } = useKanban();

  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-4 bg-background border-b-transparent shadow-md">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-primary" />
        <h1 className="text-xl font-semibold text-primary">Kanban Dashboard</h1>
      </div>
      <Button
        onClick={createNewColumn}
        className="text-black group border-dashed border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
        variant="outline"
        size="lg"
        disabled={columns.length >= 8}
      >
        <IconPlus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
        Agregar Columna
      </Button>
    </header>
  );
}
