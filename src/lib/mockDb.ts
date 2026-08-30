import { useEffect, useSyncExternalStore } from "react";

/* ============================================================
 * قاعدة بيانات محلية (الوضع الافتراضي) — تعمل بدون إنترنت
 * وتُحفظ في متصفح المستخدم. لا يوجد نظام قيود يومية هنا،
 * فقط الحركات النقدية وأرصدة الخزن.
 * ============================================================ */

export type SafeType = "main" | "branch" | "bank" | "wallet";
export type PayMethod = "cash" | "transfer" | "cheque" | "wallet";
export type VoucherKind = "receipt" | "payment";
export type DocStatus = "draft" | "posted" | "cancelled";

export interface Branch {
  id: string;
  name: string;
}

export interface AppUser {
  id: string;
  name: string;
  role: string;
}

export interface Party {
  id: string;
  code: string;
  name: string;
  phone: string;
  branchId: string;
}

export interface Category {
  id: string;
  name: string;
  kind: "revenue" | "expense";
}

/** تصنيفات الأصناف — تُدار من الإعدادات الرئيسية */
export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  note?: string;
  active: boolean;
}

/** الإعدادات الرئيسية للبرنامج: بيانات الطباعة والضرائب والسياسات */
export interface OrgSettings {
  /* بيانات تظهر فى كل المطبوعات */
  companyName: string;
  companyNameEn: string;
  activity: string;
  taxNo: string;
  commercialNo: string;
  address: string;
  phone: string;
  phone2: string;
  email: string;
  website: string;
  logoLetter: string;
  printFooter: string;
  invoiceTerms: string;
  showSignatures: boolean;
  /* الضرائب والسياسات المالية */
  vatRate: number;
  whtRate: number;
  currencyLabel: string;
  defaultPaymentDays: number;
  allowNegativeStock: boolean;
  priceEditInPos: boolean;
  maxLineDiscountPct: number;
}


export interface Safe {
  id: string;
  code: string;
  name: string;
  type: SafeType;
  branchId: string;
  ownerId: string;
  openingBalance: number;
  bankName?: string;
  accountNo?: string;
  active: boolean;
  notes?: string;
}

export interface Allocation {
  invoiceId: string;
  amount: number;
}

export interface Voucher {
  id: string;
  kind: VoucherKind;
  no: string;
  date: string;
  safeId: string;
  branchId: string;
  userId: string;
  partyType: "customer" | "supplier" | "other";
  partyId: string | null;
  categoryId: string | null;
  costCenter: string;
  method: PayMethod;
  reference: string;
  amount: number;
  note: string;
  status: DocStatus;
  allocations: Allocation[];
  reconciled: boolean;
  shiftId: string | null;
  auto?: boolean;
}

export interface Transfer {
  id: string;
  no: string;
  date: string;
  fromSafeId: string;
  toSafeId: string;
  amount: number;
  fee: number;
  userId: string;
  note: string;
  status: DocStatus;
}

export interface Invoice {
  id: string;
  no: string;
  type: "sales" | "purchase";
  partyId: string;
  date: string;
  dueDate: string;
  total: number;
  paid: number;
}

export interface Shift {
  id: string;
  no: string;
  safeId: string;
  userId: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  systemBalance: number | null;
  countedBalance: number | null;
  difference: number | null;
  reason: string;
  status: "open" | "closed";
}


/* ===================== العملاء والمبيعات ===================== */

/** كود الوحدة — الأكواد الافتراضية موجودة، ويمكن للمستخدم تكويد وحدات جديدة من شاشة «تكويد الوحدات» */
export type Unit = string;

/** وحدة قياس مكوّدة فى النظام (بيانات رئيسية) */
export interface MeasureUnit {
  id: string;
  /** كود مختصر بالإنجليزى (kg / ton / bag …) */
  code: string;
  /** الاسم العربى الظاهر فى الشاشات والطباعة */
  name: string;
  /** عدد الخانات العشرية المسموحة للكميات بهذه الوحدة */
  decimals: number;
  note: string;
  active: boolean;
}

export type SalesPayMethod = "cash" | "card" | "credit" | "multi";
export type InvoiceView = "professional" | "simple";

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  branchId: string;
}

export interface SalesRep {
  id: string;
  name: string;
  phone: string;
  branchId: string;
  commissionPct: number;
}

/** وحدة بيع/شراء إضافية للصنف مع معامل التحويل إلى الوحدة الأساسية */
export interface ProductUnit {
  id: string;
  code: string;
  name: string;
  /** عدد الوحدات الأساسية داخل هذه الوحدة (مثال: طن = 1000 كيلو → 1000) */
  factor: number;
  /** سعر بيع هذه الوحدة */
  price: number;
  /** سعر جملة هذه الوحدة (اختيارى) */
  wholesalePrice?: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  barcode: string;
  serial: string;
  unit: Unit;
  unitPrice: number;
  wholesalePrice: number;
  cost: number;
  taxRate: number;
  category: string;
  stock: number;
  minStock: number;
  active: boolean;
  /** وحدات إضافية للصنف مع معاملات التحويل للوحدة الأساسية */
  units?: ProductUnit[];
}

export interface DiscountCode {
  id: string;
  code: string;
  percent: number;
  active: boolean;
}

export interface SalesLine {
  id: string;
  productId: string;
  code: string;
  name: string;
  qty: number;
  unit: Unit;
  /** كود الوحدة المستخدمة فى السطر (الأساسية أو وحدة تحويل) */
  unitCode?: string;
  /** مسمى الوحدة المستخدمة فى السطر */
  unitName?: string;
  /** معامل التحويل للوحدة الأساسية (1 للوحدة الأساسية) */
  unitFactor?: number;
  price: number;
  discountPct: number;
  discountAmt: number;
  taxRate: number;
}

export interface SalesInvoice {
  id: string;
  no: string;
  date: string;
  dueDate: string;
  view: InvoiceView;
  branchId: string;
  warehouseId: string;
  repId: string | null;
  userId: string;
  customerId: string | null;
  customerName: string;
  lines: SalesLine[];
  payMethod: SalesPayMethod;
  payCash: number;
  payCard: number;
  safeId: string | null;
  discountCode: string;
  note: string;
  status: DocStatus;
}

/** الوحدات الافتراضية المكوّدة عند أول تشغيل */
export const DEFAULT_UNIT_LABEL: Record<string, string> = {
  kg: "كيلو",
  ton: "طن",
  bag: "شيكارة",
  pcs: "عدد",
};

/** اسم الوحدة للعرض — يقرأ من الوحدات المكوّدة فى النظام ثم الافتراضية */
export function unitLabel(code?: string | null): string {
  const key = String(code ?? "").trim();
  if (!key) return "";
  const coded = getDb().measureUnits?.find((u) => u.code === key);
  return coded?.name?.trim() || DEFAULT_UNIT_LABEL[key] || key;
}

/**
 * خريطة أسماء الوحدات — تُقرأ ديناميكياً من الوحدات المكوّدة
 * حتى تظهر الوحدات الجديدة فى كل الشاشات بدون تعديل.
 */
export const UNIT_LABEL: Record<string, string> = new Proxy(
  {},
  {
    get: (_t, key: string) => unitLabel(key),
    has: () => true,
    ownKeys: () => Object.keys(DEFAULT_UNIT_LABEL),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  },
) as Record<string, string>;


export const SALES_PAY_LABEL: Record<SalesPayMethod, string> = {
  cash: "نقدي",
  card: "شبكة",
  credit: "آجل",
  multi: "متعدد",
};

export interface PurchaseInvoice {
  id: string;
  no: string;
  date: string;
  dueDate: string;
  branchId: string;
  warehouseId: string;
  userId: string;
  supplierId: string | null;
  supplierName: string;
  supplierInvoiceNo: string;
  lines: SalesLine[];
  payMethod: SalesPayMethod;
  payCash: number;
  payCard: number;
  safeId: string | null;
  note: string;
  status: DocStatus;
}

export interface DbShape {
  branches: Branch[];
  users: AppUser[];
  customers: Party[];
  suppliers: Party[];
  categories: Category[];
  safes: Safe[];
  vouchers: Voucher[];
  transfers: Transfer[];
  invoices: Invoice[];
  shifts: Shift[];
  warehouses: Warehouse[];
  reps: SalesRep[];
  products: Product[];
  discountCodes: DiscountCode[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  productCategories: ProductCategory[];
  measureUnits: MeasureUnit[];
  settings: OrgSettings;

}

const STORAGE_KEY = "aliman_treasury_v1";

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

function d(offsetDays: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function seed(): DbShape {
  const branches: Branch[] = [
    { id: "br1", name: "الفرع الرئيسي - القاهرة" },
    { id: "br2", name: "فرع المنوفية" },
    { id: "br3", name: "فرع الشرقية" },
  ];

  const users: AppUser[] = [
    { id: "u1", name: "محمد الإيمان", role: "مدير النظام" },
    { id: "u2", name: "أحمد سالم", role: "أمين خزينة" },
    { id: "u3", name: "منى عبد الله", role: "محاسب" },
  ];

  const customers: Party[] = [
    { id: "c1", code: "CU-001", name: "مزرعة النيل للدواجن", phone: "01001234567", branchId: "br1" },
    { id: "c2", code: "CU-002", name: "مزرعة الوادي الأخضر", phone: "01112345678", branchId: "br2" },
    { id: "c3", code: "CU-003", name: "شركة دلتا للألبان", phone: "01223456789", branchId: "br3" },
    { id: "c4", code: "CU-004", name: "تجارة أعلاف الصفا", phone: "01098765432", branchId: "br1" },
  ];

  const suppliers: Party[] = [
    { id: "s1", code: "SU-001", name: "مصانع الدلتا للأعلاف", phone: "01234567890", branchId: "br1" },
    { id: "s2", code: "SU-002", name: "شركة الصويا للاستيراد", phone: "01555667788", branchId: "br1" },
    { id: "s3", code: "SU-003", name: "مطاحن الشرق للذرة", phone: "01099887766", branchId: "br3" },
  ];

  const categories: Category[] = [
    { id: "rv1", name: "إيراد نقل وشحن", kind: "revenue" },
    { id: "rv2", name: "إيراد بيع أجولة فارغة", kind: "revenue" },
    { id: "rv3", name: "إيرادات متنوعة", kind: "revenue" },
    { id: "ex1", name: "رواتب وأجور", kind: "expense" },
    { id: "ex2", name: "نقل وشحن", kind: "expense" },
    { id: "ex3", name: "كهرباء ومياه", kind: "expense" },
    { id: "ex4", name: "صيانة وقطع غيار", kind: "expense" },
    { id: "ex5", name: "مصروفات إدارية", kind: "expense" },
    { id: "ex6", name: "فروقات خزينة", kind: "expense" },
  ];

  const safes: Safe[] = [
    {
      id: "sf1",
      code: "CASH-01",
      name: "الخزينة الرئيسية",
      type: "main",
      branchId: "br1",
      ownerId: "u2",
      openingBalance: 250000,
      active: true,
      notes: "خزينة المركز الرئيسي",
    },
    {
      id: "sf2",
      code: "CASH-02",
      name: "خزينة فرع المنوفية",
      type: "branch",
      branchId: "br2",
      ownerId: "u3",
      openingBalance: 60000,
      active: true,
    },
    {
      id: "sf3",
      code: "CASH-03",
      name: "خزينة فرع الشرقية",
      type: "branch",
      branchId: "br3",
      ownerId: "u3",
      openingBalance: 45000,
      active: true,
    },
    {
      id: "sf4",
      code: "BANK-01",
      name: "البنك الأهلي المصري - جاري",
      type: "bank",
      branchId: "br1",
      ownerId: "u1",
      openingBalance: 900000,
      bankName: "البنك الأهلي المصري",
      accountNo: "1234567890123",
      active: true,
    },
    {
      id: "sf5",
      code: "BANK-02",
      name: "بنك مصر - جاري",
      type: "bank",
      branchId: "br1",
      ownerId: "u1",
      openingBalance: 340000,
      bankName: "بنك مصر",
      accountNo: "9876543210987",
      active: true,
    },
    {
      id: "sf6",
      code: "WALL-01",
      name: "محفظة فودافون كاش",
      type: "wallet",
      branchId: "br1",
      ownerId: "u2",
      openingBalance: 25000,
      accountNo: "01001234567",
      active: true,
    },
  ];

  const invoices: Invoice[] = [
    { id: "inv1", no: "SI-1001", type: "sales", partyId: "c1", date: d(-40), dueDate: d(-10), total: 185000, paid: 85000 },
    { id: "inv2", no: "SI-1002", type: "sales", partyId: "c1", date: d(-25), dueDate: d(5), total: 96000, paid: 0 },
    { id: "inv3", no: "SI-1003", type: "sales", partyId: "c2", date: d(-70), dueDate: d(-40), total: 143500, paid: 143500 },
    { id: "inv4", no: "SI-1004", type: "sales", partyId: "c2", date: d(-18), dueDate: d(12), total: 77250, paid: 20000 },
    { id: "inv5", no: "SI-1005", type: "sales", partyId: "c3", date: d(-95), dueDate: d(-65), total: 210000, paid: 50000 },
    { id: "inv6", no: "SI-1006", type: "sales", partyId: "c4", date: d(-6), dueDate: d(24), total: 58900, paid: 0 },
    { id: "inv7", no: "PI-2001", type: "purchase", partyId: "s1", date: d(-33), dueDate: d(-3), total: 420000, paid: 200000 },
    { id: "inv8", no: "PI-2002", type: "purchase", partyId: "s2", date: d(-15), dueDate: d(15), total: 365000, paid: 0 },
    { id: "inv9", no: "PI-2003", type: "purchase", partyId: "s3", date: d(-80), dueDate: d(-50), total: 158000, paid: 60000 },
  ];

  const vouchers: Voucher[] = [
    {
      id: "v1",
      kind: "receipt",
      no: "RV-000001",
      date: d(-12),
      safeId: "sf1",
      branchId: "br1",
      userId: "u2",
      partyType: "customer",
      partyId: "c1",
      categoryId: null,
      costCenter: "",
      method: "cash",
      reference: "",
      amount: 85000,
      note: "تحصيل جزئي من فاتورة SI-1001",
      status: "posted",
      allocations: [{ invoiceId: "inv1", amount: 85000 }],
      reconciled: false,
      shiftId: null,
    },
    {
      id: "v2",
      kind: "receipt",
      no: "RV-000002",
      date: d(-8),
      safeId: "sf4",
      branchId: "br1",
      userId: "u1",
      partyType: "customer",
      partyId: "c2",
      categoryId: null,
      costCenter: "",
      method: "transfer",
      reference: "TRX-55210",
      amount: 20000,
      note: "تحويل بنكي من العميل",
      status: "posted",
      allocations: [{ invoiceId: "inv4", amount: 20000 }],
      reconciled: true,
      shiftId: null,
    },
    {
      id: "v3",
      kind: "receipt",
      no: "RV-000003",
      date: d(-4),
      safeId: "sf2",
      branchId: "br2",
      userId: "u3",
      partyType: "other",
      partyId: null,
      categoryId: "rv1",
      costCenter: "النقل",
      method: "cash",
      reference: "",
      amount: 6500,
      note: "إيراد نقل شيكارة أعلاف",
      status: "posted",
      allocations: [],
      reconciled: false,
      shiftId: null,
    },
    {
      id: "v4",
      kind: "payment",
      no: "PV-000001",
      date: d(-10),
      safeId: "sf4",
      branchId: "br1",
      userId: "u1",
      partyType: "supplier",
      partyId: "s1",
      categoryId: null,
      costCenter: "",
      method: "transfer",
      reference: "TRX-99120",
      amount: 200000,
      note: "سداد جزئي لفاتورة PI-2001",
      status: "posted",
      allocations: [{ invoiceId: "inv7", amount: 200000 }],
      reconciled: true,
      shiftId: null,
    },
    {
      id: "v5",
      kind: "payment",
      no: "PV-000002",
      date: d(-3),
      safeId: "sf1",
      branchId: "br1",
      userId: "u2",
      partyType: "other",
      partyId: null,
      categoryId: "ex2",
      costCenter: "النقل",
      method: "cash",
      reference: "",
      amount: 12400,
      note: "أجرة سيارة نقل أعلاف",
      status: "posted",
      allocations: [],
      reconciled: false,
      shiftId: null,
    },
    {
      id: "v6",
      kind: "payment",
      no: "PV-000003",
      date: d(-1),
      safeId: "sf1",
      branchId: "br1",
      userId: "u2",
      partyType: "other",
      partyId: null,
      categoryId: "ex1",
      costCenter: "الإدارة",
      method: "cash",
      reference: "",
      amount: 48000,
      note: "رواتب العمالة اليومية",
      status: "draft",
      allocations: [],
      reconciled: false,
      shiftId: null,
    },
  ];

  const transfers: Transfer[] = [
    {
      id: "tr1",
      no: "TF-000001",
      date: d(-6),
      fromSafeId: "sf4",
      toSafeId: "sf1",
      amount: 150000,
      fee: 250,
      userId: "u1",
      note: "تغذية الخزينة الرئيسية",
      status: "posted",
    },
    {
      id: "tr2",
      no: "TF-000002",
      date: d(-2),
      fromSafeId: "sf1",
      toSafeId: "sf2",
      amount: 40000,
      fee: 0,
      userId: "u2",
      note: "تغذية خزينة الفرع",
      status: "posted",
    },
  ];

  const shifts: Shift[] = [
    {
      id: "sh1",
      no: "SH-000001",
      safeId: "sf1",
      userId: "u2",
      openedAt: `${d(-2)}T08:00`,
      closedAt: `${d(-2)}T20:00`,
      openingBalance: 250000,
      systemBalance: 322600,
      countedBalance: 322400,
      difference: -200,
      reason: "عجز بسيط في فكة نهاية اليوم",
      status: "closed",
    },
    {
      id: "sh2",
      no: "SH-000002",
      safeId: "sf1",
      userId: "u2",
      openedAt: `${d(0)}T08:00`,
      closedAt: null,
      openingBalance: 322400,
      systemBalance: null,
      countedBalance: null,
      difference: null,
      reason: "",
      status: "open",
    },
  ];


  const warehouses: Warehouse[] = [
    { id: "wh1", code: "WH-01", name: "المخزن الرئيسي - القاهرة", branchId: "br1" },
    { id: "wh2", code: "WH-02", name: "مخزن المنوفية", branchId: "br2" },
    { id: "wh3", code: "WH-03", name: "مخزن الشرقية", branchId: "br3" },
  ];

  const reps: SalesRep[] = [
    { id: "rp1", name: "خالد مصطفى", phone: "01011122233", branchId: "br1", commissionPct: 1 },
    { id: "rp2", name: "سيد الشيمي", phone: "01122233344", branchId: "br2", commissionPct: 1.5 },
    { id: "rp3", name: "عمرو زكي", phone: "01233344455", branchId: "br3", commissionPct: 1.25 },
  ];

  const products: Product[] = [
    { id: "p1", code: "IT-1001", name: "علف بادي دواجن 21%", barcode: "6221000010013", serial: "SR-1001", unit: "ton", unitPrice: 21500, wholesalePrice: 20800, cost: 19200, taxRate: 14, category: "أعلاف دواجن", stock: 120, minStock: 20, active: true, units: [ { id: "pu1", code: "kg", name: "كيلو", factor: 0.001, price: 22.5, wholesalePrice: 21.5 }, { id: "pu2", code: "bag50", name: "شيكارة 50 كجم", factor: 0.05, price: 1120, wholesalePrice: 1080 } ] },
    { id: "p2", code: "IT-1002", name: "علف نامي دواجن 19%", barcode: "6221000010020", serial: "SR-1002", unit: "ton", unitPrice: 20200, wholesalePrice: 19600, cost: 18100, taxRate: 14, category: "أعلاف دواجن", stock: 85, minStock: 15, active: true },
    { id: "p3", code: "IT-1003", name: "علف ناهي دواجن 17%", barcode: "6221000010037", serial: "SR-1003", unit: "ton", unitPrice: 19400, wholesalePrice: 18900, cost: 17400, taxRate: 14, category: "أعلاف دواجن", stock: 64, minStock: 15, active: true },
    { id: "p4", code: "IT-2001", name: "علف مركز ألبان 21%", barcode: "6221000020012", serial: "SR-2001", unit: "ton", unitPrice: 18700, wholesalePrice: 18200, cost: 16800, taxRate: 14, category: "أعلاف ماشية", stock: 48, minStock: 10, active: true },
    { id: "p5", code: "IT-2002", name: "علف تسمين ماشية 16%", barcode: "6221000020029", serial: "SR-2002", unit: "ton", unitPrice: 17300, wholesalePrice: 16900, cost: 15600, taxRate: 14, category: "أعلاف ماشية", stock: 30, minStock: 10, active: true },
    { id: "p6", code: "IT-3001", name: "كسب صويا 46%", barcode: "6221000030011", serial: "SR-3001", unit: "ton", unitPrice: 32500, wholesalePrice: 31800, cost: 30100, taxRate: 14, category: "خامات", stock: 22, minStock: 8, active: true },
    { id: "p7", code: "IT-3002", name: "ذرة صفراء مجروشة", barcode: "6221000030028", serial: "SR-3002", unit: "ton", unitPrice: 14200, wholesalePrice: 13800, cost: 12900, taxRate: 14, category: "خامات", stock: 150, minStock: 25, active: true },
    { id: "p8", code: "IT-3003", name: "ردة ناعمة", barcode: "6221000030035", serial: "SR-3003", unit: "ton", unitPrice: 9800, wholesalePrice: 9500, cost: 8900, taxRate: 14, category: "خامات", stock: 90, minStock: 20, active: true },
    { id: "p9", code: "IT-4001", name: "شيكارة علف أرانب 40 كجم", barcode: "6221000040010", serial: "SR-4001", unit: "bag", unitPrice: 780, wholesalePrice: 755, cost: 700, taxRate: 14, category: "أعلاف أرانب", stock: 640, minStock: 100, active: true, units: [ { id: "pu3", code: "kg", name: "كيلو", factor: 0.025, price: 21, wholesalePrice: 20 } ] },
    { id: "p10", code: "IT-5001", name: "أجولة بلاستيك فارغة", barcode: "6221000050019", serial: "SR-5001", unit: "pcs", unitPrice: 12, wholesalePrice: 10.5, cost: 8, taxRate: 14, category: "مستلزمات", stock: 5200, minStock: 500, active: true },
  ];

  const productCategories: ProductCategory[] = [
    { id: "pc1", code: "CT-001", name: "أعلاف دواجن", note: "بادي / نامي / ناهي", active: true },
    { id: "pc2", code: "CT-002", name: "أعلاف ماشية", note: "مركزات وتسمين", active: true },
    { id: "pc3", code: "CT-003", name: "أعلاف أرانب", note: "شيكارات جاهزة", active: true },
    { id: "pc4", code: "CT-004", name: "خامات", note: "ذرة — صويا — ردة", active: true },
    { id: "pc5", code: "CT-005", name: "مستلزمات", note: "أجولة وخيوط وأدوات", active: true },
  ];

  const measureUnits: MeasureUnit[] = [
    { id: "mu1", code: "ton", name: "طن", decimals: 3, note: "1 طن = 1000 كيلو", active: true },
    { id: "mu2", code: "kg", name: "كيلو", decimals: 2, note: "وحدة الوزن الأساسية", active: true },
    { id: "mu3", code: "bag", name: "شيكارة", decimals: 0, note: "شيكارة 50 / 40 / 25 كجم", active: true },
    { id: "mu4", code: "pcs", name: "عدد", decimals: 0, note: "قطعة / وحدة", active: true },
    { id: "mu5", code: "qnt", name: "قنطار", decimals: 2, note: "1 قنطار = 50 كيلو", active: true },
    { id: "mu6", code: "box", name: "كرتونة", decimals: 0, note: "", active: true },
    { id: "mu7", code: "ltr", name: "لتر", decimals: 2, note: "", active: true },
  ];

  const settings: OrgSettings = {
    companyName: "الإيمان لتجارة الأعلاف",
    companyNameEn: "AL-IMAN FEED TRADING CO",
    activity: "أعلاف دواجن وماشية وخامات — بيع جملة وتجزئة",
    taxNo: "100-200-300",
    commercialNo: "12345",
    address: "القاهرة — جمهورية مصر العربية",
    phone: "01000000000",
    phone2: "",
    email: "info@aliman-feed.com",
    website: "www.aliman-feed.com",
    logoLetter: "إ",
    printFooter: "هذه الفاتورة صادرة من نظام الإيمان المحاسبي",
    invoiceTerms: "البضاعة المبيعة لا تُرد ولا تُستبدل بعد 24 ساعة من الاستلام.",
    showSignatures: true,
    vatRate: 14,
    whtRate: 1,
    currencyLabel: "ج.م",
    defaultPaymentDays: 30,
    allowNegativeStock: false,
    priceEditInPos: true,
    maxLineDiscountPct: 25,
  };



  const discountCodes: DiscountCode[] = [
    { id: "dc1", code: "FEED5", percent: 5, active: true },
    { id: "dc2", code: "SUMMER10", percent: 10, active: true },
    { id: "dc3", code: "VIP3", percent: 3, active: true },
  ];

  const salesInvoices: SalesInvoice[] = [
    {
      id: "si1",
      no: "SO-000001",
      date: d(-5),
      dueDate: d(25),
      view: "professional",
      branchId: "br1",
      warehouseId: "wh1",
      repId: "rp1",
      userId: "u1",
      customerId: "c1",
      customerName: "مزرعة النيل للدواجن",
      lines: [
        { id: "sl1", productId: "p1", code: "IT-1001", name: "علف بادي دواجن 21%", qty: 5, unit: "ton", price: 21500, discountPct: 2, discountAmt: 0, taxRate: 14 },
        { id: "sl2", productId: "p7", code: "IT-3002", name: "ذرة صفراء مجروشة", qty: 3, unit: "ton", price: 14200, discountPct: 0, discountAmt: 500, taxRate: 14 },
      ],
      payMethod: "credit",
      payCash: 0,
      payCard: 0,
      safeId: null,
      discountCode: "",
      note: "توريد للمزرعة رقم 2",
      status: "posted",
    },
    {
      id: "si2",
      no: "SO-000002",
      date: d(-2),
      dueDate: d(-2),
      view: "professional",
      branchId: "br2",
      warehouseId: "wh2",
      repId: "rp2",
      userId: "u3",
      customerId: null,
      customerName: "عميل نقدي",
      lines: [
        { id: "sl3", productId: "p9", code: "IT-4001", name: "شيكارة علف أرانب 40 كجم", qty: 40, unit: "bag", price: 780, discountPct: 0, discountAmt: 0, taxRate: 14 },
      ],
      payMethod: "cash",
      payCash: 35568,
      payCard: 0,
      safeId: "sf2",
      discountCode: "",
      note: "",
      status: "posted",
    },
  ];

  const purchaseInvoices: PurchaseInvoice[] = [
    {
      id: "pi1",
      no: "PO-000001",
      date: d(-12),
      dueDate: d(18),
      branchId: "br1",
      warehouseId: "wh1",
      userId: "u1",
      supplierId: "s1",
      supplierName: "مصانع الدلتا للأعلاف",
      supplierInvoiceNo: "DL-9931",
      lines: [
        { id: "pl1", productId: "p1", code: "IT-1001", name: "علف بادي دواجن 21%", qty: 20, unit: "ton", price: 19800, discountPct: 0, discountAmt: 0, taxRate: 14 },
      ],
      payMethod: "credit",
      payCash: 0,
      payCard: 0,
      safeId: null,
      note: "توريد شهري",
      status: "posted",
    },
    {
      id: "pi2",
      no: "PO-000002",
      date: d(-4),
      dueDate: d(-4),
      branchId: "br3",
      warehouseId: "wh3",
      userId: "u3",
      supplierId: "s3",
      supplierName: "مطاحن الشرق للذرة",
      supplierInvoiceNo: "SH-1204",
      lines: [
        { id: "pl2", productId: "p7", code: "IT-3002", name: "ذرة صفراء مجروشة", qty: 15, unit: "ton", price: 13100, discountPct: 1, discountAmt: 0, taxRate: 14 },
      ],
      payMethod: "cash",
      payCash: 221800,
      payCard: 0,
      safeId: "sf1",
      note: "",
      status: "posted",
    },
  ];

  return {
    branches,
    users,
    customers,
    suppliers,
    categories,
    safes,
    vouchers,
    transfers,
    invoices,
    shifts,
    warehouses,
    reps,
    products,
    discountCodes,
    salesInvoices,
    purchaseInvoices,
    productCategories,
    measureUnits,
    settings,

  };
}

/* ===================== المخزن ===================== */

let db: DbShape | null = null;
const listeners = new Set<() => void>();
let version = 0;

function load(): DbShape {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DbShape>;
      const base = seed();
      return {
        ...base,
        ...parsed,
        purchaseInvoices: parsed.purchaseInvoices ?? base.purchaseInvoices,
        productCategories: parsed.productCategories?.length ? parsed.productCategories : base.productCategories,
        measureUnits: parsed.measureUnits?.length ? parsed.measureUnits : base.measureUnits,
        settings: { ...base.settings, ...(parsed.settings ?? {}) },
      };


    }
  } catch {
    /* تجاهل وابدأ من البيانات الافتراضية */
  }
  return seed();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* المتصفح ممتلئ — نتجاهل */
  }
}

export function getDb(): DbShape {
  if (!db) db = load();
  return db;
}

function emit() {
  version += 1;
  persist();
  listeners.forEach((l) => l());
}

export function mutate(fn: (data: DbShape) => void) {
  const data = getDb();
  fn(data);
  emit();
}

export function resetDb() {
  db = seed();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getVersion() {
  return version;
}

/** تحميل البيانات المحفوظة بعد الـ hydration فقط لتجنّب اختلاف الخادم والمتصفح */
let hydrated = false;
function hydrateDb() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  db = load();
  emit();
}

/** يعيد قراءة البيانات ويعيد الرسم عند أي تعديل */
export function useDb(): DbShape {
  useSyncExternalStore(subscribe, getVersion, () => 0);
  useEffect(() => {
    hydrateDb();
  }, []);
  return getDb();
}


/* ===================== أدوات مساعدة ===================== */

export function nextNo(prefix: string, existing: string[]): string {
  let max = 0;
  for (const value of existing) {
    const n = Number(String(value).split("-").pop());
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(6, "0")}`;
}

/** توليد كود تلقائى بنفس نمط الأكواد الموجودة (عدد الخانات + البادئة) */
export function nextCode(prefix: string, existing: string[]): string {
  let max = 0;
  let width = 3;
  for (const value of existing) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    if (prefix && !text.toUpperCase().startsWith(`${prefix.toUpperCase()}-`)) continue;
    const tail = text.split("-").pop() ?? "";
    const n = Number(tail);
    if (!tail || Number.isNaN(n)) continue;
    width = Math.max(width, tail.length);
    if (n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

/** منع تكرار البيانات: يتحقق من عدم وجود قيمة مكررة في حقل مفتاحي */
export function isDuplicate<T extends { id: string }>(
  rows: T[],
  field: keyof T,

  value: unknown,
  ignoreId?: string,
): boolean {
  const target = String(value ?? "").trim().toLowerCase();
  if (!target) return false;
  return rows.some(
    (row) =>
      String(row[field] ?? "").trim().toLowerCase() === target &&
      (row as { id?: string }).id !== ignoreId,
  );
}

export function partyName(data: DbShape, partyType: string, partyId: string | null): string {
  if (!partyId) return "-";
  const list = partyType === "supplier" ? data.suppliers : data.customers;
  return list.find((p) => p.id === partyId)?.name ?? "-";
}

export const SAFE_TYPE_LABEL: Record<SafeType, string> = {
  main: "خزينة رئيسية",
  branch: "خزينة فرع",
  bank: "حساب بنكي",
  wallet: "محفظة إلكترونية",
};

export const METHOD_LABEL: Record<PayMethod, string> = {
  cash: "نقدي",
  transfer: "تحويل بنكي",
  cheque: "شيك",
  wallet: "محفظة إلكترونية",
};

export const STATUS_LABEL: Record<DocStatus, string> = {
  draft: "مسودة",
  posted: "مُرحّل",
  cancelled: "ملغي",
};

/** حفظ الإعدادات الرئيسية */
export function saveSettings(patch: Partial<OrgSettings>) {
  mutate((data) => {
    data.settings = { ...data.settings, ...patch };
  });
}
