import { SidebarTrigger } from "@/components/ui/sidebar";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useKanban } from "@/context/KanbanContext";
import { useState } from "react";
import CreateColumnSheet from "./Sheet/Column/CreateColumnSheet";
import { SearchInput } from "./SearchInput";

interface HeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export default function Header({ searchValue, onSearchChange }: HeaderProps) {
  const { createNewColumn, columns } = useKanban();
  const [createColumnDialogOpen, setCreateColumnDialogOpen] =
    useState<boolean>(false);

  const handleCreateColumn = (content: string) => {
    createNewColumn(content);
    setCreateColumnDialogOpen(false);
  };

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4 bg-background border-b-transparent shadow-md">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-primary" />
          <h1 className="text-xl font-semibold text-primary">
            Kanban Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <SearchInput value={searchValue} onChange={onSearchChange} />
          <Button
            onClick={() => setCreateColumnDialogOpen(true)}
            className="text-black group border-dashed border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
            variant="outline"
            disabled={columns.length >= 8}
          >
            <IconPlus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
            Agregar Columna
          </Button>
        </div>
      </header>
      <CreateColumnSheet
        open={createColumnDialogOpen}
        onOpenChange={setCreateColumnDialogOpen}
        onSave={handleCreateColumn}
      />
    </>
  );
}
