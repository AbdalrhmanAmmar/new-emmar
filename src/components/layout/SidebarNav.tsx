import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

import type { NavGroup, NavModule } from "@/components/layout/navConfig";
import { cn } from "@/lib/utils";

interface Props {
  modules: NavModule[];
  pathname: string;
  collapsed: boolean;
  openGroup: string;
  onToggleGroup: (id: string) => void;
}

function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function ItemLink({
  to,
  label,
  icon,
  active,
  collapsed,
  size = "sm",
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  size?: "sm" | "md";
}) {
  return (
    <Link
      to={to}
      title={label}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 transition-colors",
        size === "md" ? "py-2 text-sm font-medium" : "py-2 text-[13px]",
        active
          ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function Group({
  group,
  pathname,
  collapsed,
  isOpen,
  onToggle,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-0.5">
      <button
        type="button"
        onClick={onToggle}
        title={group.label}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
          isOpen ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70",
        )}
      >
        {group.icon}
        {!collapsed && <span className="flex-1 text-right">{group.label}</span>}
        {!collapsed && <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />}
      </button>
      {isOpen ? (
        <div className={cn("mt-1 space-y-0.5", !collapsed && "me-3 border-e border-sidebar-border pe-2")}>
          {group.items.map((item) => (
            <ItemLink
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              active={isActive(pathname, item.to)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav({ modules, pathname, collapsed, openGroup, onToggleGroup }: Props) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-2 pb-3">
      {modules.map((module) => {
        const moduleActive = pathname.startsWith(module.home.to);
        return (
          <section
            key={module.id}
            className={cn(
              "rounded-xl border border-transparent transition-colors",
              moduleActive && !collapsed && "border-sidebar-border/70 bg-sidebar-accent/25 p-1.5",
            )}
          >
            {!collapsed ? (
              <div className="flex items-center gap-2 px-2 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-sidebar-foreground/50">
                {module.icon}
                <span className="truncate">{module.label}</span>
              </div>
            ) : null}

            <ItemLink
              to={module.home.to}
              label={module.home.label}
              icon={module.home.icon}
              collapsed={collapsed}
              active={pathname === module.home.to}
              size="md"
            />

            {module.groups.map((group) => (
              <Group
                key={group.id}
                group={group}
                pathname={pathname}
                collapsed={collapsed}
                isOpen={openGroup === group.id}
                onToggle={() => onToggleGroup(openGroup === group.id ? "" : group.id)}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
