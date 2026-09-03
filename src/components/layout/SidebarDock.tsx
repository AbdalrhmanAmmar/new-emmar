import { Link } from "@tanstack/react-router";
import { PanelRightOpen } from "lucide-react";
import { useMemo, useState } from "react";

import { MODULES } from "@/components/layout/navConfig";
import { hasPerm, screenForPath, useCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";

interface Props {
  pathname: string;
  onExpand: () => void;
}

/** شريط الموديولات العائم (Dock) يظهر عند تصغير السايد بار — خلفية بلور + قائمة صفحات عند الوقوف */
export function SidebarDock({ pathname, onExpand }: Props) {
  const current = useCurrentUser();
  const [hovered, setHovered] = useState<string>("");

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
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 hidden justify-center lg:flex">
      <div
        dir="rtl"
        className="dock-enter pointer-events-auto flex items-end gap-1.5 rounded-2xl border border-sidebar-border/60 bg-sidebar/70 px-3 pb-2.5 pt-3 shadow-[0_18px_45px_-15px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150"
        onMouseLeave={() => setHovered("")}
      >
        {modules.map((module) => {
          const active = pathname.startsWith(module.home.to);
          const open = hovered === module.id;

          return (
            <div key={module.id} className="relative flex flex-col items-center">
              {open ? (
                <div className="dock-menu-enter absolute bottom-[calc(100%+14px)] w-[248px] max-h-[62vh] overflow-y-auto rounded-2xl border border-sidebar-border/60 bg-sidebar/85 p-2 text-sidebar-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl backdrop-saturate-150">
                  <p className="px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wide text-sidebar-primary">
                    {module.label}
                  </p>
                  <Link
                    to={module.home.to}
                    onClick={() => setHovered("")}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors",
                      pathname === module.home.to
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent",
                    )}
                  >
                    {module.home.icon}
                    <span className="truncate">{module.home.label}</span>
                  </Link>
                  {module.groups.map((group) => (
                    <div key={group.id} className="mt-1.5">
                      <p className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-sidebar-foreground/55">
                        {group.icon}
                        <span className="truncate">{group.label}</span>
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setHovered("")}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors",
                              pathname === item.to
                                ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            )}
                          >
                            {item.icon}
                            <span className="truncate">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                title={module.label}
                onMouseEnter={() => setHovered(module.id)}
                onFocus={() => setHovered(module.id)}
                onClick={() => setHovered(open ? "" : module.id)}
                className={cn(
                  "grid size-11 place-items-center rounded-xl border transition-all duration-200 ease-out",
                  open ? "-translate-y-3 scale-110 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.6)]" : "translate-y-0",
                  active || open
                    ? "border-sidebar-primary/40 bg-sidebar-primary text-sidebar-primary-foreground"
                    : "border-sidebar-border/50 bg-sidebar-accent/50 text-sidebar-foreground/80 hover:bg-sidebar-accent",
                )}
              >
                {module.icon}
              </button>
              <span
                className={cn(
                  "mt-1 h-1 w-1 rounded-full transition-opacity",
                  active ? "bg-sidebar-primary opacity-100" : "opacity-0",
                )}
              />
            </div>
          );
        })}

        <span className="mx-1 h-8 w-px self-center bg-sidebar-border/60" />

        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onExpand}
            title="إظهار القائمة الجانبية"
            className="grid size-11 place-items-center rounded-xl border border-sidebar-border/50 bg-sidebar-accent/50 text-sidebar-foreground/80 transition-all duration-200 hover:-translate-y-2 hover:bg-sidebar-accent"
          >
            <PanelRightOpen className="size-5" />
          </button>
          <span className="mt-1 h-1 w-1" />
        </div>
      </div>
    </div>
  );
}
