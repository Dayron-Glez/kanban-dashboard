import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Header() {
  return (
    <header className="flex items-center gap-4 border-b px-6 py-4 bg-background border-b-transparent shadow-md">
      <SidebarTrigger className="text-primary" />
      <h1 className="text-xl font-semibold text-primary">Kanban Dashboard</h1>
    </header>
  );
}
