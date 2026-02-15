import type { ComponentType } from "react";
import { IconHome, IconSettings, IconInfoCircle } from "@tabler/icons-react";
import type { IconProps } from "@tabler/icons-react";
import { Link } from "react-router";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/index";

type MenuItem = {
  icon: ComponentType<IconProps>;
  label: string;
  path: string;
};

export function SideBarContent() {
  const { open } = useSidebar();

  const menuItems: MenuItem[] = [
    { icon: IconHome, label: "Inicio", path: "/" },
    { icon: IconSettings, label: "Ajustes", path: "/settings" },
    { icon: IconInfoCircle, label: "Info", path: "/info" },
  ];

  return (
    <SidebarContent className="bg-background py-10">
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {menuItems.map((item: MenuItem) => {
              const IconComponent = item.icon;
              return (
                <SidebarMenuItem key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md hover:bg-muted transition-colors ${
                      open ? "justify-start" : "justify-center"
                    }`}
                  >
                    <IconComponent
                      size={24}
                      className="text-primary shrink-0"
                    />
                    {open && (
                      <span className="font-semibold text-primary">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
