import { Outlet, useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MODULES, matchModule, matchNavItem } from "@/components/layout/navConfig";
import { useOnline } from "@/components/layout/useOnline";
import { cn } from "@/lib/utils";

/** الهيكل العام: سايد بار مقسّم بالموديولات + هيدر + محتوى الصفحة */
export function AppLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const online = useOnline();

  const activeGroup = useMemo(() => {
    for (const module of MODULES) {
      const group = module.groups.find((g) =>
        g.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)),
      );
      if (group) return group.id;
    }
    return matchModule(pathname).groups[0]?.id ?? "";
  }, [pathname]);

  const [openGroup, setOpenGroup] = useState(activeGroup);
  useEffect(() => setOpenGroup(activeGroup), [activeGroup]);
  useEffect(() => setMobileOpen(false), [pathname]);

  const activeModule = matchModule(pathname);
  const crumb = matchNavItem(pathname)?.label ?? activeModule.home.label;

  const [openModule, setOpenModule] = useState(activeModule.id);
  useEffect(() => setOpenModule(activeModule.id), [activeModule.id]);

  const sidebar = (
    <AppSidebar
      pathname={pathname}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((value) => !value)}
      openGroup={openGroup}
      onToggleGroup={setOpenGroup}
      openModule={openModule}
      onToggleModule={setOpenModule}
      online={online}
    />
  );

  return (
    <AuthGate>
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 bg-sidebar transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-[268px]",
        )}
      >
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 end-0 w-[280px] bg-sidebar shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute start-2 top-3 rounded-md p-1.5 text-sidebar-foreground"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          moduleLabel={activeModule.label}
          crumb={crumb}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="page-transition mx-auto w-full max-w-[1400px] flex-1 p-3 sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
    </AuthGate>
  );
}
