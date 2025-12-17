import { IconHome, IconSettings, IconInfoCircle } from "@tabler/icons-react";
import { Link } from "react-router";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

type MenuItem = {
  icon: ComponentType<IconProps>;
  label: string;
  path: string;
};

export default function SideBarContent() {
  const menuItems: MenuItem[] = [
    { icon: IconHome, label: "Inicio", path: "/" },
    { icon: IconSettings, label: "Ajustes", path: "/settings" },
    { icon: IconInfoCircle, label: "Info", path: "/info" },
  ];

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <Link to={item.path}>
                      <IconComponent />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
