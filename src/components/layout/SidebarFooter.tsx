import { Wifi, WifiOff } from "lucide-react";

interface Props {
  collapsed: boolean;
  online: boolean;
}

export function SidebarFooter({ collapsed, online }: Props) {
  return (
    <div className="border-t border-sidebar-border px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-foreground">
          م
        </span>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-sidebar-foreground">محمد الإيمان</div>
            <div className="flex items-center gap-1 text-[11px] text-sidebar-foreground">
              {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {online ? "متصل" : "غير متصل — يعمل أوف لاين"}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
