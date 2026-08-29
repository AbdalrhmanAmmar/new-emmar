import { Link, useRouterState } from "@tanstack/react-router";
import {
  Banknote,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
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

/** تبويبات التنقل السفلي على الموبيل. */
const mobileTabs: { path: string; label: string; icon: typeof Wallet }[] = [
  { path: "/accounting", label: "الرئيسية", icon: PieChart },
  { path: "/accounting/sales-orders", label: "المبيعات", icon: Truck },
  { path: "/accounting/purchase-orders", label: "المشتريات", icon: ShoppingCart },
  { path: "/accounting/stock-balance", label: "المخزون", icon: Boxes },
];

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
      <header className="sticky top-0 z-40 border-b border-white/10 bg-sidebar/95 pt-[env(safe-area-inset-top)] text-sidebar-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-sidebar/80">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:h-16">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 hover:bg-white/10 hover:text-sidebar-foreground lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="القائمة"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* الهوية: كاملة على الشاشات الكبيرة، مختصرة على الموبيل */}
          <Link to="/accounting" className="group hidden items-center gap-2.5 lg:flex">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground shadow-sm transition-transform group-hover:scale-105">
              <Wallet className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight">برنامج إعمار المحاسبى</span>
              <span className="text-[11px] text-sidebar-foreground/60">إعمار لتجارة الأعلاف — الجنيه المصري</span>
            </span>
          </Link>

          {/* عنوان الشاشة الحالية بأسلوب تطبيقات الموبيل */}
          <div className="flex min-w-0 flex-1 flex-col items-center leading-tight lg:hidden">
            <span className="max-w-full truncate text-[15px] font-bold">
              {activeItem?.label ?? "لوحة المتابعة"}
            </span>
            {activeGroupTitle && (
              <span className="max-w-full truncate text-[10px] text-sidebar-foreground/60">{activeGroupTitle}</span>
            )}
          </div>

          <div className="mx-1 hidden h-8 w-px bg-white/10 lg:block" />

          <Button
            variant="ghost"
            size="icon"
            className="hidden shrink-0 hover:bg-white/10 hover:text-sidebar-foreground lg:inline-flex"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
            title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
          >
            {collapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
          </Button>

          {/* مسار الصفحة الحالية */}
          <nav aria-label="مسار التنقل" className="hidden min-w-0 items-center gap-1.5 text-xs lg:flex">
            {activeGroupTitle && (
              <>
                <span className="truncate rounded-md bg-white/10 px-2 py-1 font-medium text-sidebar-foreground/70">
                  {activeGroupTitle}
                </span>
                <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
              </>
            )}
            <span className="truncate font-semibold text-accent">{activeItem?.label ?? "لوحة المتابعة"}</span>
          </nav>

          <div className="flex shrink-0 items-center gap-2 lg:ms-auto">
            <OfflineIndicator />
            <Button
              variant="outline"
              size="sm"
              className="hidden border-white/15 bg-transparent text-sidebar-foreground shadow-sm hover:bg-white/10 hover:text-sidebar-foreground sm:inline-flex"
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

      {/* خلفية معتمة للدرج على الموبيل */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div className="flex">
        <aside
          style={{ width: sidebarWidth }}
          className={`fixed inset-y-0 start-0 z-40 flex max-w-[86vw] flex-col overflow-hidden bg-sidebar p-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-out lg:sticky lg:top-16 lg:z-30 lg:h-[calc(100vh-4rem)] lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:pt-2.5 lg:shadow-none ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* رأس الدرج على الموبيل */}
          <div className="mb-2 flex items-center gap-2.5 border-b border-sidebar-border pb-2.5 lg:hidden">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Wallet className="h-4.5 w-4.5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
              <span className="truncate text-[13px] font-bold">برنامج إعمار المحاسبى</span>
              <span className="truncate text-[10px] text-sidebar-foreground/60">إعمار لتجارة الأعلاف</span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 hover:bg-white/10 hover:text-sidebar-foreground"
              onClick={() => setMobileOpen(false)}
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {accountingNav.map((group) => {
                const Icon = groupIcons[group.title] ?? Settings;
                const expanded = openGroup === group.title;
                const hasActive = group.title === activeGroupTitle;

                if (collapsed) {
                  return (
                    <div
                      key={group.title}
                      className={`grid h-11 place-items-center rounded-lg ${
                        hasActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent"
                      }`}
                      title={group.title}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  );
                }
                return (
                  <div key={group.title}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.title)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-start text-[13px] font-semibold transition-colors ${
                        hasActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {hasActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-primary" />}
                      <span className="flex-1 truncate text-start">{group.title}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-sidebar-foreground/45 transition-transform ${expanded ? "" : "-rotate-90"}`}
                      />
                    </button>

                    {expanded && (
                      <ul className="mt-1 space-y-1 rounded-xl bg-sidebar-accent/45 p-1.5 ring-1 ring-sidebar-border">
                        {group.items.map((item) => {
                          const active = pathname === item.path;
                          return (
                            <li key={item.path}>
                              <Link
                                to={item.path}
                                onClick={() => setMobileOpen(false)}
                                className={`relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                                  active
                                    ? "bg-sidebar-primary font-bold text-sidebar-primary-foreground shadow-sm"
                                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                }`}
                              >
                                {active && (
                                  <span className="absolute start-1.5 h-4 w-[3px] rounded-full bg-sidebar-primary-foreground/70" />
                                )}
                                <span className="flex-1 truncate text-start">{item.label}</span>
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

            {/* تذييل القائمة: السنة المالية + المستخدم + أدوات */}
            {!collapsed && (
              <div className="shrink-0 space-y-2 border-t border-sidebar-border pt-2.5">
                <div>
                  <span className="mb-1 block text-[10px] text-sidebar-foreground/55">السنة المالية</span>
                  <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/60 px-2.5 py-2 text-[13px] font-semibold">
                    <CalendarDays className="h-4 w-4 shrink-0 text-sidebar-primary" />
                    <span className="flex-1 text-start">{new Date().getFullYear()}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-foreground/45" />
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[11px] font-bold text-sidebar-primary">
                    إع
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col items-start leading-tight">
                    <span className="truncate text-[12px] font-bold">مدير النظام</span>
                    <span className="truncate text-[10px] text-sidebar-foreground/55">الوضع التجريبي</span>
                  </div>
                </div>
              </div>
            )}
          </div>
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

        <main className="min-w-0 flex-1 p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:p-4 lg:p-6 lg:pb-6">
          <div key={pathname} className="page-transition">
            {children}
          </div>
        </main>
      </div>

      {/* شريط التنقل السفلي بأسلوب تطبيقات الموبيل */}
      <nav
        aria-label="التنقل السريع"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-sidebar/95 pb-[env(safe-area-inset-bottom)] text-sidebar-foreground backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {mobileTabs.map((tab) => {
            const active = tab.path === "/accounting" ? pathname === tab.path : pathname.startsWith(tab.path);
            return (
              <li key={tab.path}>
                <Link
                  to={tab.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
                    active ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                  }`}
                >
                  <span
                    className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${
                      active ? "bg-sidebar-primary/15" : ""
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                  </span>
                  <span className="truncate">{tab.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex w-full flex-col items-center gap-1 py-2 text-[10px] font-semibold text-sidebar-foreground/60"
            >
              <span className="grid h-8 w-12 place-items-center rounded-full">
                <Menu className="h-5 w-5" />
              </span>
              <span>المزيد</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default AccountingLayout;
