import {
  ArrowLeftRight,
  CalendarCheck,
  HandCoins,
  Tags,
  UserCog,
  BadgeDollarSign,
  Banknote,
  FileText,
  Landmark,
  LayoutDashboard,
  ClipboardCheck,
  ListChecks,
  Receipt,
  Ruler,
  ScanBarcode,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserPlus,
  Truck,
  ShoppingCart,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Package,
  TrendingUp,
  Undo2,
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
        { to: "/sales/pos", label: "الكاشير (نقطة بيع)", icon: <ScanBarcode className="size-4" /> },
        { to: "/sales/returns", label: "مرتجعات المبيعات", icon: <Undo2 className="size-4" /> },
      ],
    },
  ],
};


export const PURCHASES_MODULE: NavModule = {
  id: "purchases",
  label: "الموردون والمشتريات",
  icon: <Truck className="size-4" />,
  home: { to: "/purchases", label: "لوحة المشتريات", icon: <LayoutDashboard className="size-4" /> },
  groups: [
    {
      id: "purchases-docs",
      label: "فواتير الشراء",
      icon: <Receipt className="size-4" />,
      items: [
        { to: "/purchases/invoices", label: "فواتير المشتريات", icon: <Receipt className="size-4" /> },
        { to: "/purchases/invoices/new", label: "فاتورة مشتريات جديدة", icon: <BadgeDollarSign className="size-4" /> },
        { to: "/purchases/returns", label: "مرتجعات المشتريات", icon: <Undo2 className="size-4" /> },
      ],
    },
  ],
};

export const INVENTORY_MODULE: NavModule = {
  id: "inventory",
  label: "المخازن والمخزون",
  icon: <Warehouse className="size-4" />,
  home: { to: "/inventory", label: "لوحة المخازن", icon: <LayoutDashboard className="size-4" /> },
  groups: [
    {
      id: "inventory-docs",
      label: "الأذون المخزنية",
      icon: <Boxes className="size-4" />,
      items: [
        { to: "/inventory/moves", label: "كل الأذون المخزنية", icon: <Boxes className="size-4" /> },
        { to: "/inventory/moves/receipts", label: "أذون إضافة مخزون", icon: <ArrowDownToLine className="size-4" /> },
        { to: "/inventory/moves/issues", label: "أذون صرف مخزني", icon: <ArrowUpFromLine className="size-4" /> },
        { to: "/inventory/moves/transfers", label: "التحويل بين المخازن", icon: <ArrowLeftRight className="size-4" /> },
        { to: "/inventory/moves/new", label: "إذن مخزني جديد", icon: <Package className="size-4" /> },
      ],
    },
    {
      id: "inventory-master",
      label: "المخازن والأرصدة",
      icon: <Warehouse className="size-4" />,
      items: [
        { to: "/inventory/warehouses", label: "تكويد المخازن", icon: <Warehouse className="size-4" /> },
        { to: "/inventory/balance", label: "أرصدة المخازن", icon: <ListChecks className="size-4" /> },
        { to: "/inventory/stocktake", label: "جرد المخازن", icon: <ClipboardCheck className="size-4" /> },
      ],
    },
  ],
};

export const EXPENSES_MODULE: NavModule = {
  id: "expenses",
  label: "المصروفات العامة والنثريات",
  icon: <HandCoins className="size-4" />,
  home: { to: "/expenses", label: "لوحة المصروفات", icon: <LayoutDashboard className="size-4" /> },
  groups: [
    {
      id: "expenses-docs",
      label: "حركات الصرف",
      icon: <Receipt className="size-4" />,
      items: [
        { to: "/expenses/list", label: "سجل المصروفات", icon: <Receipt className="size-4" /> },
        { to: "/expenses/new", label: "تسجيل مصروف جديد", icon: <Banknote className="size-4" /> },
      ],
    },
    {
      id: "expenses-master",
      label: "البيانات الرئيسية",
      icon: <Tags className="size-4" />,
      items: [{ to: "/expenses/items", label: "تكويد بنود الصرف", icon: <Tags className="size-4" /> }],
    },
  ],
};

export const HR_MODULE: NavModule = {
  id: "hr",
  label: "الموظفون",
  icon: <UserCog className="size-4" />,
  home: { to: "/hr", label: "لوحة الموظفين", icon: <LayoutDashboard className="size-4" /> },
  groups: [
    {
      id: "hr-employees",
      label: "بيانات الموظفين",
      icon: <Users className="size-4" />,
      items: [
        { to: "/hr/employees", label: "سجل الموظفين", icon: <Users className="size-4" /> },
        { to: "/hr/employees/new", label: "موظف جديد", icon: <UserCog className="size-4" /> },
      ],
    },
    {
      id: "hr-attendance",
      label: "الحضور والرواتب",
      icon: <CalendarCheck className="size-4" />,
      items: [
        { to: "/hr/attendance", label: "تحضير الموظفين", icon: <CalendarCheck className="size-4" /> },
        { to: "/hr/adjustments", label: "البدلات والخصومات", icon: <Wallet className="size-4" /> },
        { to: "/hr/payroll", label: "مسير الرواتب", icon: <Wallet className="size-4" /> },
      ],
    },
  ],
};

/** موديول التقارير: كل التقارير (خزينة + مبيعات) مجمّعة فى مكان واحد */
export const REPORTS_MODULE: NavModule = {
  id: "reports",
  label: "التقارير",
  icon: <ScrollText className="size-4" />,
  home: { to: "/reports", label: "مركز التقارير", icon: <LayoutDashboard className="size-4" /> },
  groups: [
    {
      id: "reports-treasury",
      label: "تقارير الخزينة",
      icon: <Wallet className="size-4" />,
      items: [
        { to: "/treasury/reports/cashflow", label: "التدفق النقدي", icon: <ScrollText className="size-4" /> },
        { to: "/treasury/reports/vouchers", label: "تحليل السندات", icon: <Receipt className="size-4" /> },
        { to: "/treasury/reports/aging", label: "أعمار الديون", icon: <FileText className="size-4" /> },
        { to: "/treasury/reports/shift-closing", label: "تقفيل الورديات", icon: <ListChecks className="size-4" /> },
        { to: "/treasury/reports/shift-diff", label: "فروقات التقفيل", icon: <ListChecks className="size-4" /> },
      ],
    },
    {
      id: "reports-sales",
      label: "تقارير المبيعات",
      icon: <ShoppingCart className="size-4" />,
      items: [
        { to: "/sales/reports/by-product", label: "المبيعات حسب الصنف", icon: <ScrollText className="size-4" /> },
        { to: "/sales/reports/by-rep", label: "المبيعات حسب المندوب", icon: <ScrollText className="size-4" /> },
        { to: "/sales/reports/by-customer", label: "المبيعات حسب العميل", icon: <ScrollText className="size-4" /> },
        {
          to: "/sales/reports/customer-products",
          label: "تقرير أصناف العميل",
          icon: <ScrollText className="size-4" />,
        },
        { to: "/reports/customer-statement", label: "كشف حساب عميل", icon: <FileText className="size-4" /> },
      ],
    },
    {
      id: "reports-hr",
      label: "تقارير الموظفين والمصروفات",
      icon: <UserCog className="size-4" />,
      items: [
        { to: "/hr/statement", label: "كشف حساب موظف", icon: <FileText className="size-4" /> },
        { to: "/hr/payroll", label: "مسير الرواتب", icon: <Wallet className="size-4" /> },
        { to: "/expenses/list", label: "سجل المصروفات", icon: <Receipt className="size-4" /> },
      ],
    },
    {
      id: "reports-inventory",
      label: "تقارير المخازن",
      icon: <Warehouse className="size-4" />,
      items: [
        { to: "/inventory/balance", label: "أرصدة وتقييم المخزون", icon: <ListChecks className="size-4" /> },
        { to: "/inventory/moves", label: "حركة الأذون المخزنية", icon: <Boxes className="size-4" /> },
        { to: "/inventory/stocktake-report", label: "تقرير الجرد", icon: <ClipboardCheck className="size-4" /> },
      ],
    },
    {
      id: "reports-purchases",
      label: "تقارير المشتريات",
      icon: <Truck className="size-4" />,
      items: [
        { to: "/purchases/reports/by-product", label: "المشتريات حسب الصنف", icon: <ScrollText className="size-4" /> },
        { to: "/purchases/reports/by-supplier", label: "المشتريات حسب المورد", icon: <ScrollText className="size-4" /> },
        {
          to: "/purchases/reports/supplier-products",
          label: "تقرير أصناف المورد",
          icon: <ScrollText className="size-4" />,
        },
        {
          to: "/purchases/reports/supplier-statement",
          label: "كشف حساب مورد",
          icon: <FileText className="size-4" />,
        },
      ],
    },
  ],
};

/** موديول إدارة المستخدمين والصلاحيات */
export const USERS_MODULE: NavModule = {
  id: "users",
  label: "إدارة المستخدمين",
  icon: <ShieldCheck className="size-4" />,
  home: { to: "/users", label: "سجل المستخدمين", icon: <Users className="size-4" /> },
  groups: [
    {
      id: "users-accounts",
      label: "حسابات المستخدمين",
      icon: <Users className="size-4" />,
      items: [
        { to: "/users", label: "سجل المستخدمين", icon: <Users className="size-4" /> },
        { to: "/users/new", label: "مستخدم جديد", icon: <UserPlus className="size-4" /> },
      ],
    },
    {
      id: "users-perms",
      label: "الأدوار والصلاحيات",
      icon: <ShieldCheck className="size-4" />,
      items: [{ to: "/users/permissions", label: "الصلاحيات", icon: <ShieldCheck className="size-4" /> }],
    },
  ],
};

/** قائمة الترس: كل الإعدادات والبيانات الرئيسية فى مكان واحد */
export interface SettingsGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: "settings-system",
    label: "إعدادات النظام",
    items: [
      { to: "/treasury/settings", label: "الإعدادات الرئيسية وبيانات النظام", icon: <Settings2 className="size-4" /> },
      { to: "/users", label: "المستخدمون", icon: <Users className="size-4" /> },
      { to: "/users/permissions", label: "الصلاحيات", icon: <ShieldCheck className="size-4" /> },
    ],
  },
  {
    id: "settings-master",
    label: "البيانات الرئيسية",
    items: [
      { to: "/sales/customers", label: "العملاء", icon: <Users className="size-4" /> },
      { to: "/purchases/suppliers", label: "الموردون", icon: <Truck className="size-4" /> },
      { to: "/sales/products", label: "الأصناف والأسعار", icon: <ListChecks className="size-4" /> },
      { to: "/sales/units", label: "تكويد الوحدات", icon: <Ruler className="size-4" /> },
      { to: "/inventory/warehouses", label: "المخازن", icon: <Warehouse className="size-4" /> },
    ],
  },
];

export const SETTINGS_ITEMS: NavItem[] = SETTINGS_GROUPS.flatMap((g) => g.items);

export const MODULES: NavModule[] = [
  TREASURY_MODULE,
  SALES_MODULE,
  PURCHASES_MODULE,
  INVENTORY_MODULE,
  EXPENSES_MODULE,
  HR_MODULE,
  USERS_MODULE,
  REPORTS_MODULE,
];

export const ALL_NAV_ITEMS: NavItem[] = [
  ...MODULES.flatMap((module) => [module.home, ...module.groups.flatMap((group) => group.items)]),
  ...SETTINGS_ITEMS,
];

/** أفضل تطابق للمسار الحالى (أطول مسار مطابق) */
export function matchNavItem(pathname: string): NavItem | undefined {
  return [...ALL_NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

export function matchModule(pathname: string): NavModule {
  // التقارير أولاً: مساراتها تحت /treasury/reports و /sales/reports
  const byItem = MODULES.find((module) =>
    module.groups.some((group) =>
      group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)),
    ),
  );
  if (byItem) return byItem;
  return MODULES.find((module) => pathname.startsWith(module.home.to)) ?? TREASURY_MODULE;
}

