import { MODULES } from "@/components/layout/navConfig";
import { SidebarBrand } from "@/components/layout/SidebarBrand";
import { SidebarFooter } from "@/components/layout/SidebarFooter";
import { SidebarNav } from "@/components/layout/SidebarNav";

interface Props {
  pathname: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  openGroup: string;
  onToggleGroup: (id: string) => void;
  online: boolean;
}

export function AppSidebar({
  pathname,
  collapsed,
  onToggleCollapsed,
  openGroup,
  onToggleGroup,
  online,
}: Props) {
  return (
    <nav className="flex h-full flex-col">
      <SidebarBrand collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
      <SidebarNav
        modules={MODULES}
        pathname={pathname}
        collapsed={collapsed}
        openGroup={openGroup}
        onToggleGroup={onToggleGroup}
      />
      <SidebarFooter collapsed={collapsed} online={online} />
    </nav>
  );
}
