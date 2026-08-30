import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BadgeDollarSign,
  Banknote,
  ChevronDown,
  FileText,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Receipt,
  ScrollText,
  Search,
  Settings2,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { dateFmt, money } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface NavGroup {
  id: string;
  label: string;
  icon: ReactNode;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    id: "sales",
    label: "العملاء والمبيعات",
    icon: <BadgeDollarSign className="size-4" />,
    items: [
      { to: "/sales", label: "لوحة المبيعات", icon: <LayoutDashboard className="size-4" /> },
      { to: "/sales/invoices", label: "فواتير المبيعات", icon: <Receipt className="size-4" /> },
      { to: "/sales/customers", label: "العملاء", icon: <FileText className="size-4" /> },
      { to: "/sales/products", label: "الأصناف والأسعار", icon: <ListChecks className="size-4" /> },
      { to: "/sales/reports/by-product", label: "المبيعات حسب الصنف", icon: <ScrollText className="size-4" /> },
      { to: "/sales/reports/by-rep", label: "المبيعات حسب المندوب", icon: <ScrollText className="size-4" /> },
      { to: "/sales/reports/by-customer", label: "المبيعات حسب العميل", icon: <ScrollText className="size-4" /> },
    ],
  },
  {

    id: "cash",
    label: "الخزن والحسابات",
    icon: <Landmark className="size-4" />,
    items: [
      { to: "/treasury/safes", label: "الخزن والحسابات", icon: <Wallet className="size-4" /> },
      { to: "/treasury/statement", label: "كشف حركة الخزينة", icon: <ScrollText className="size-4" /> },
      { to: "/treasury/transfers", label: "التحويل بين الخزن", icon: <ArrowLeftRight className="size-4" /> },
    ],
  },
  {
    id: "vouchers",
    label: "السندات المالية",
    icon: <Receipt className="size-4" />,
    items: [
      { to: "/treasury/receipts", label: "سندات القبض", icon: <BadgeDollarSign className="size-4" /> },
      { to: "/treasury/payments", label: "سندات الصرف", icon: <Banknote className="size-4" /> },
      { to: "/treasury/invoices", label: "الفواتير الآجلة", icon: <FileText className="size-4" /> },
    ],
  },
  {
    id: "closing",
    label: "التقفيل والمطابقة",
    icon: <ListChecks className="size-4" />,
    items: [
      { to: "/treasury/shifts", label: "تقفيل الخزينة / الوردية", icon: <ListChecks className="size-4" /> },
      { to: "/treasury/reconcile", label: "المطابقة البنكية", icon: <Landmark className="size-4" /> },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    icon: <ScrollText className="size-4" />,
    items: [
      { to: "/treasury/reports/cashflow", label: "التدفق النقدي", icon: <ScrollText className="size-4" /> },
      { to: "/treasury/reports/vouchers", label: "تحليل السندات", icon: <Receipt className="size-4" /> },
      { to: "/treasury/reports/aging", label: "أعمار الديون", icon: <FileText className="size-4" /> },
      { to: "/treasury/reports/shift-diff", label: "فروقات التقفيل", icon: <ListChecks className="size-4" /> },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات المتقدمة",
    icon: <Settings2 className="size-4" />,
    items: [{ to: "/treasury/settings", label: "إعدادات وبيانات النظام", icon: <Settings2 className="size-4" /> }],
  },
];

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function TreasuryLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const online = useOnline();

  const activeGroup = useMemo(
    () => NAV.find((group) => group.items.some((item) => pathname.startsWith(item.to)))?.id ?? "cash",
    [pathname],
  );
  const [openGroup, setOpenGroup] = useState(activeGroup);
  useEffect(() => setOpenGroup(activeGroup), [activeGroup]);
  useEffect(() => setMobileOpen(false), [pathname]);

  const crumb =
    NAV.flatMap((group) => group.items).find((item) => pathname.startsWith(item.to))?.label ??
    "لوحة الخزينة";

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        {!collapsed ? (
          <Link to="/treasury" className="flex items-center gap-2 text-sidebar-foreground">
            <span className="grid size-9 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-bold">
              إ
            </span>
            <span className="text-sm font-bold">الإيمان لتجارة الأعلاف</span>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label="توسيع/تضييق القائمة"
          className="hidden rounded-md p-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent lg:block"
        >
          {collapsed ? <PanelRightOpen className="size-4" /> : <PanelRightClose className="size-4" />}
        </button>
      </div>

      <Link
        to="/treasury"
        className={cn(
          "mx-2 mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          pathname === "/treasury"
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/85 hover:bg-sidebar-accent",
        )}
      >
        <LayoutDashboard className="size-4" />
        {!collapsed && <span>لوحة الخزينة</span>}
      </Link>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {NAV.map((group) => {
          const isOpen = openGroup === group.id;
          return (
            <div key={group.id} className="mt-1">
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? "" : group.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  isOpen
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70",
                )}
              >
                {group.icon}
                {!collapsed && <span className="flex-1 text-right">{group.label}</span>}
                {!collapsed && (
                  <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                )}
              </button>
              {isOpen ? (
                <div className={cn("mt-1 space-y-0.5", !collapsed && "border-e border-sidebar-border pe-2 me-4")}>
                  {group.items.map((item) => {
                    const active = pathname.startsWith(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                          active
                            ? "bg-sidebar-primary/90 font-semibold text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        )}
                      >
                        {item.icon}
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

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
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* سايد بار سطح المكتب */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 bg-sidebar transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-[268px]",
        )}
      >
        {sidebar}
      </aside>

      {/* سايد بار الموبايل */}
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
        <header className="sticky top-0 z-30 border-b border-sidebar-border/40 bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 hover:bg-sidebar-accent lg:hidden"
              aria-label="القائمة"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden text-sm sm:block">
              <span className="text-sidebar-foreground/60">الخزينة والمعاملات المالية</span>
              <span className="mx-2 text-sidebar-foreground/40">/</span>
              <span className="font-semibold">{crumb}</span>
            </div>
            <GlobalSearch />
          </div>
        </header>

        <main className="page-transition mx-auto w-full max-w-[1400px] flex-1 p-3 sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ===================== البحث الشامل ===================== */

function GlobalSearch() {
  const data = useDb();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Array<{ to: string; title: string; sub: string }> = [];

    for (const safe of data.safes) {
      if (`${safe.code} ${safe.name}`.toLowerCase().includes(q))
        out.push({ to: "/treasury/safes", title: `${safe.code} — ${safe.name}`, sub: "خزينة / حساب" });
    }
    for (const voucher of data.vouchers) {
      if (`${voucher.no} ${voucher.note} ${voucher.reference}`.toLowerCase().includes(q))
        out.push({
          to: voucher.kind === "receipt" ? "/treasury/receipts" : "/treasury/payments",
          title: `${voucher.no} — ${money(voucher.amount)}`,
          sub: `${voucher.kind === "receipt" ? "سند قبض" : "سند صرف"} — ${dateFmt(voucher.date)}`,
        });
    }
    for (const transfer of data.transfers) {
      if (`${transfer.no} ${transfer.note}`.toLowerCase().includes(q))
        out.push({ to: "/treasury/transfers", title: transfer.no, sub: "تحويل بين الخزن" });
    }
    for (const invoice of data.invoices) {
      if (invoice.no.toLowerCase().includes(q))
        out.push({
          to: "/treasury/invoices",
          title: `${invoice.no} — ${money(invoice.total)}`,
          sub: invoice.type === "sales" ? "فاتورة بيع" : "فاتورة شراء",
        });
    }
    for (const party of [...data.customers, ...data.suppliers]) {
      if (`${party.code} ${party.name}`.toLowerCase().includes(q))
        out.push({ to: "/treasury/reports/aging", title: party.name, sub: `${party.code} — طرف تعامل` });
    }
    return out.slice(0, 12);
  }, [data, query]);

  return (
    <div className="relative ms-auto w-full max-w-none flex-1">
      <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/60" />
      <Input
        dir="rtl"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder="بحث شامل: سند، فاتورة، خزينة، عميل..."
        className="h-9 rounded-full border-sidebar-border/60 bg-sidebar-accent/60 pe-9 text-right text-sidebar-foreground placeholder:text-sidebar-foreground/50"
      />
      {open && results.length > 0 ? (
        <div className="absolute inset-x-0 top-11 z-40 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
          {results.map((result, index) => (
            <Link
              key={`${result.to}-${index}`}
              to={result.to}
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2 text-right text-sm last:border-0 hover:bg-primary/5"
            >
              <span className="font-medium">{result.title}</span>
              <span className="text-xs text-muted-foreground">{result.sub}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
