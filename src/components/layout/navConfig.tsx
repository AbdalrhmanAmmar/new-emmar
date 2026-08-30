import {
  ArrowLeftRight,
  BadgeDollarSign,
  Banknote,
  FileText,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Receipt,
  ScrollText,
  Settings2,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: ReactNode;
  items: NavItem[];
}

/** موديول = قسم رئيسي فى السايد بار (له لوحة خاصة + مجموعات فرعية) */
export interface NavModule {
  id: string;
  label: string;
  icon: ReactNode;
  /** الصفحة الرئيسية للموديول */
  home: NavItem;
  groups: NavGroup[];
}

export const TREASURY_MODULE: NavModule = {
  id: "treasury",
  label: "الخزينة والمعاملات المالية",
  icon: <Wallet className="size-4" />,
  home: { to: "/treasury", label: "لوحة الخزينة", icon: <LayoutDashboard className="size-4" /> },
  groups: [
    {
      id: "treasury-cash",
      label: "الخزن والحسابات",
      icon: <Landmark className="size-4" />,
      items: [
        { to: "/treasury/safes", label: "الخزن والحسابات البنكية", icon: <Wallet className="size-4" /> },
        { to: "/treasury/statement", label: "كشف حركة الخزينة", icon: <ScrollText className="size-4" /> },
        { to: "/treasury/transfers", label: "التحويل بين الخزن", icon: <ArrowLeftRight className="size-4" /> },
      ],
    },
    {
      id: "treasury-vouchers",
      label: "السندات المالية",
      icon: <Receipt className="size-4" />,
      items: [
        { to: "/treasury/receipts", label: "سندات القبض", icon: <BadgeDollarSign className="size-4" /> },
        { to: "/treasury/payments", label: "سندات الصرف", icon: <Banknote className="size-4" /> },
        { to: "/treasury/invoices", label: "الفواتير الآجلة", icon: <FileText className="size-4" /> },
      ],
    },
    {
      id: "treasury-closing",
      label: "التقفيل والمطابقة",
      icon: <ListChecks className="size-4" />,
      items: [
        { to: "/treasury/shifts", label: "تقفيل الخزينة / الوردية", icon: <ListChecks className="size-4" /> },
        { to: "/treasury/reconcile", label: "المطابقة البنكية", icon: <Landmark className="size-4" /> },
      ],
    },
    {
      id: "treasury-reports",
      label: "تقارير الخزينة",
      icon: <ScrollText className="size-4" />,
      items: [
        { to: "/treasury/reports/cashflow", label: "التدفق النقدي", icon: <ScrollText className="size-4" /> },
        { to: "/treasury/reports/vouchers", label: "تحليل السندات", icon: <Receipt className="size-4" /> },
        { to: "/treasury/reports/aging", label: "أعمار الديون", icon: <FileText className="size-4" /> },
        { to: "/treasury/reports/shift-diff", label: "فروقات التقفيل", icon: <ListChecks className="size-4" /> },
      ],
    },
    {
      id: "treasury-settings",
      label: "إعدادات الخزينة",
      icon: <Settings2 className="size-4" />,
      items: [{ to: "/treasury/settings", label: "إعدادات وبيانات النظام", icon: <Settings2 className="size-4" /> }],
    },
  ],
};

export const SALES_MODULE: NavModule = {
  id: "sales",
  label: "العملاء والمبيعات",
  icon: <ShoppingCart className="size-4" />,
  home: { to: "/sales", label: "لوحة المبيعات", icon: <LayoutDashboard className="size-4" /> },
  groups: [
    {
      id: "sales-docs",
      label: "فواتير البيع",
      icon: <Receipt className="size-4" />,
      items: [
        { to: "/sales/invoices", label: "فواتير المبيعات", icon: <Receipt className="size-4" /> },
        { to: "/sales/invoices/new", label: "فاتورة مبيعات جديدة", icon: <BadgeDollarSign className="size-4" /> },
      ],
    },
    {
      id: "sales-master",
      label: "البيانات الأساسية",
      icon: <Users className="size-4" />,
      items: [
        { to: "/sales/customers", label: "العملاء", icon: <Users className="size-4" /> },
        { to: "/sales/products", label: "الأصناف والأسعار", icon: <ListChecks className="size-4" /> },
      ],
    },
    {
      id: "sales-reports",
      label: "تقارير المبيعات",
      icon: <ScrollText className="size-4" />,
      items: [
        { to: "/sales/reports/by-product", label: "المبيعات حسب الصنف", icon: <ScrollText className="size-4" /> },
        { to: "/sales/reports/by-rep", label: "المبيعات حسب المندوب", icon: <ScrollText className="size-4" /> },
        { to: "/sales/reports/by-customer", label: "المبيعات حسب العميل", icon: <ScrollText className="size-4" /> },
      ],
    },
  ],
};

export const MODULES: NavModule[] = [TREASURY_MODULE, SALES_MODULE];

export const ALL_NAV_ITEMS: NavItem[] = MODULES.flatMap((module) => [
  module.home,
  ...module.groups.flatMap((group) => group.items),
]);

/** أفضل تطابق للمسار الحالى (أطول مسار مطابق) */
export function matchNavItem(pathname: string): NavItem | undefined {
  return [...ALL_NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

export function matchModule(pathname: string): NavModule {
  return MODULES.find((module) => pathname.startsWith(module.home.to)) ?? TREASURY_MODULE;
}
