import { useMemo } from "react";

import { MODULES } from "@/components/layout/navConfig";
import { SidebarBrand } from "@/components/layout/SidebarBrand";
import { SidebarFooter } from "@/components/layout/SidebarFooter";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { hasPerm, screenForPath, useCurrentUser } from "@/lib/session";

interface Props {
  pathname: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  openGroup: string;
  onToggleGroup: (id: string) => void;
  openModule: string;
  onToggleModule: (id: string) => void;
  online: boolean;
}

export function AppSidebar({
  pathname,
  collapsed,
  onToggleCollapsed,
  openGroup,
  onToggleGroup,
  openModule,
  onToggleModule,
  online,
}: Props) {
  const current = useCurrentUser();
  const modules = useMemo(
    () =>
      MODULES.map((module) => ({
        ...module,
        groups: module.groups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
              const screen = screenForPath(item.to);
              return !screen || hasPerm(current, screen, "view");
            }),
          }))
          .filter((group) => group.items.length > 0),
      })).filter((module) => module.groups.length > 0),
    [current],
  );

  return (
    <nav className="flex h-full flex-col">
      <SidebarBrand collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
      <SidebarNav
        modules={modules}
        pathname={pathname}
        collapsed={collapsed}
        openGroup={openGroup}
        onToggleGroup={onToggleGroup}
        openModule={openModule}
        onToggleModule={onToggleModule}
      />
      <SidebarFooter collapsed={collapsed} online={online} />
    </nav>
  );
}
