import { Link, useRouterState } from "@tanstack/react-router";
import {
  Banknote,
  Boxes,
  ChevronDown,
  FileText,
  Landmark,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  PieChart,
  RotateCcw,
  Settings,
  ShoppingCart,
  Sliders,
  Target,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { OfflineIndicator } from "@/components/accounting/OfflineIndicator";
import { Button } from "@/components/ui/button";
import { accountingNav } from "@/lib/accountingNav";
import { resetDb } from "@/lib/mockDb";

const groupIcons: Record<string, typeof Wallet> = {
  "الإعداد": Settings,
  "الأعلاف والمخزون": Boxes,
  "دورة المشتريات": ShoppingCart,
  "دورة المبيعات": Truck,
  "الفوترة السريعة": FileText,
  "الخزينة والبنوك": Landmark,
  "القيود والدفاتر": Banknote,
  "الأصول": Truck,
  "الموازنات والتخطيط": Target,
  "التقارير والإقفال": PieChart,
  "الإعدادات المتقدمة": Sliders,
};


const WIDTH_KEY = "acc_sidebar_width";
const MIN_W = 200;
const MAX_W = 420;

/** المجموعة التي تحتوي الصفحة الحالية. */
function groupOfPath(pathname: string) {
  const exact = accountingNav.find((g) => g.items.some((i) => i.path === pathname));
  if (exact) return exact.title;
  const prefixed = accountingNav.find((g) => g.items.some((i) => pathname.startsWith(`${i.path}/`)));
  return prefixed?.title ?? null;
}

export function AccountingLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(288);
  // موديول واحد مفتوح فقط: موديول الصفحة الحالية
  const [openGroup, setOpenGroup] = useState<string | null>(() => groupOfPath(pathname));

  // restore saved layout preferences after hydration
  useEffect(() => {
    const w = Number(window.localStorage.getItem(WIDTH_KEY));
    if (w >= MIN_W && w <= MAX_W) setWidth(w);
  }, []);

  // عند تغيير الصفحة: افتح موديولها واقفل ما عداه
  useEffect(() => {
    const g = groupOfPath(pathname);
    if (g) setOpenGroup(g);
  }, [pathname]);

  const toggleGroup = (title: string) => setOpenGroup((cur) => (cur === title ? null : title));


  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => {
      // RTL: sidebar sits on the right, so width grows as the pointer moves left
      const next = Math.min(MAX_W, Math.max(MIN_W, window.innerWidth - ev.clientX));
      setWidth(next);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.userSelect = "";
      setWidth((w) => {
        window.localStorage.setItem(WIDTH_KEY, String(w));
        return w;
      });
    };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const sidebarWidth = collapsed ? 64 : width;
  const activeGroupTitle = groupOfPath(pathname);
  const activeItem = accountingNav.flatMap((g) => g.items).find((i) => i.path === pathname);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 h-16 border-b border-border bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-full items-center gap-3 px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="القائمة"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/accounting" className="group flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <Wallet className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight sm:text-lg">برنامج إعمار المحاسبى</span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">
                إعمار لتجارة الأعلاف — الجنيه المصري
              </span>
            </span>
          </Link>

          <div className="mx-1 hidden h-8 w-px bg-border lg:block" />

          <Button
            variant="ghost"
            size="icon"
            className="hidden shrink-0 lg:inline-flex"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
            title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
          >
            {collapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
          </Button>

          {/* مسار الصفحة الحالية */}
          <nav aria-label="مسار التنقل" className="hidden min-w-0 items-center gap-1.5 text-xs md:flex">
            {activeGroupTitle && (
              <>
                <span className="truncate rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground">
                  {activeGroupTitle}
                </span>
                <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </>
            )}
            <span className="truncate font-semibold text-primary">{activeItem?.label ?? "لوحة المتابعة"}</span>
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <OfflineIndicator />
            <Button
              variant="outline"
              size="sm"
              className="shadow-sm"
              onClick={() => {
                resetDb();
                window.location.reload();
              }}
            >
              <RotateCcw className="me-1 h-4 w-4" />
              <span className="hidden sm:inline">إعادة تعيين البيانات</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          style={{ width: sidebarWidth }}
          className={`${mobileOpen ? "block" : "hidden"} fixed inset-y-16 start-0 z-30 overflow-y-auto border-e border-border bg-card p-2 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:shrink-0`}
        >
          <nav className="space-y-1.5">
            {accountingNav.map((group) => {
              const Icon = groupIcons[group.title] ?? Settings;
              const expanded = openGroup === group.title;
              const hasActive = group.title === activeGroupTitle;

              if (collapsed) {
                return (
                  <div
                    key={group.title}
                    className={`grid h-11 place-items-center rounded-md ${hasActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                    title={group.title}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                );
              }
              return (
                <div key={group.title} className="rounded-lg border border-border/60 bg-background/40">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm font-bold transition-colors hover:bg-accent/60 ${
                      hasActive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{group.title}</span>
                    <span className="rounded bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
                    />
                  </button>
                  {expanded && (
                    <ul className="space-y-0.5 border-t border-border/60 p-1.5">
                      {group.items.map((item) => {
                        const active = pathname === item.path;
                        return (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                                active
                                  ? "bg-primary font-semibold text-primary-foreground"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-primary-foreground" : "bg-border"}`}
                              />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {!collapsed && (
          <div
            onMouseDown={startResize}
            role="separator"
            aria-orientation="vertical"
            title="اسحب لتغيير عرض القائمة"
            className="hidden w-1.5 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/50 lg:block"
          />
        )}

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default AccountingLayout;
