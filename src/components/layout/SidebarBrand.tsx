import { Link } from "@tanstack/react-router";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function SidebarBrand({ collapsed, onToggleCollapsed }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-3">
      {!collapsed ? (
        <Link to="/treasury" className="flex items-center gap-2 text-sidebar-foreground">
          <span className="grid size-9 place-items-center rounded-full bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            إ
          </span>
          <span className="text-sm font-bold">الإيمان لتجارة الأعلاف</span>
        </Link>
      ) : null}
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label="توسيع/تضييق القائمة"
        className="hidden rounded-md p-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent lg:block"
      >
        {collapsed ? <PanelRightOpen className="size-4" /> : <PanelRightClose className="size-4" />}
      </button>
    </div>
  );
}
