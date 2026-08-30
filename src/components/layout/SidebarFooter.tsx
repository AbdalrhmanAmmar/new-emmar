import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings2, Wifi, WifiOff } from "lucide-react";

import { SETTINGS_GROUPS } from "@/components/layout/navConfig";
import { Button } from "@/components/ui/button";
import { hasPerm, signOut, useCurrentUser } from "@/lib/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  collapsed: boolean;
  online: boolean;
}

export function SidebarFooter({ collapsed, online }: Props) {
  const current = useCurrentUser();
  const navigate = useNavigate();
  const name = current?.user.name ?? "مستخدم";
  const roleName = current?.role?.name ?? "";
  const settingsGroups = SETTINGS_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.to.startsWith("/users") || hasPerm(current, "system.users", "view"),
    ),
  })).filter((group) => group.items.length > 0);

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="border-t border-sidebar-border px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-foreground">
          {name.trim().charAt(0)}
        </span>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-sidebar-foreground">
              {name}
              {roleName ? <span className="font-normal opacity-70"> — {roleName}</span> : null}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-sidebar-foreground">
              {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {online ? "متصل" : "غير متصل — يعمل أوف لاين"}
            </div>
          </div>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="الإعدادات والبيانات الرئيسية"
              aria-label="الإعدادات والبيانات الرئيسية"
              className="size-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Settings2 className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-60">
            {settingsGroups.map((group, index) => (
              <div key={group.id}>
                {index > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuLabel className="text-xs text-muted-foreground">{group.label}</DropdownMenuLabel>
                {group.items.map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="gap-2 text-sm">
                    <Link to={item.to}>
                      {item.icon}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut} className="gap-2 text-sm text-destructive">
              <LogOut className="size-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
