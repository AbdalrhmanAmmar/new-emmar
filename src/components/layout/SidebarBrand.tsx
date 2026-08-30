import { Link } from "@tanstack/react-router";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

import logoAsset from "@/assets/logo.jpeg.asset.json";

import { useDb } from "@/lib/mockDb";

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function SidebarBrand({ collapsed, onToggleCollapsed }: Props) {
  const { settings } = useDb();
  const logoSrc = settings.logoDataUrl || logoAsset.url;
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-3">
      <Link
        to="/treasury"
        className={`flex items-center gap-2 text-sidebar-foreground ${collapsed ? "mx-auto" : ""}`}
      >
        <img
          src={logoSrc}
          alt={`شعار ${settings.companyName}`}
          className="size-9 shrink-0 rounded-full bg-white object-cover ring-1 ring-sidebar-border"
        />
        {!collapsed ? <span className="text-sm font-bold">{settings.companyName}</span> : null}
      </Link>
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
