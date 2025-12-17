import { SidebarTrigger } from "@/components/ui/sidebar";
export default function Header() {
  return (
    <header className="flex items-center gap-4 border-b px-6 py-3">
      <SidebarTrigger className=" text-black" />
      <h1 className="text-xl font-semibold text-black">Mi Aplicación</h1>
    </header>
  );
}
