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
      const parsed = JSON.parse(raw) as DbShape;
      const base = seed();
      return { ...base, ...parsed };
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
  if (!db) db = seed();
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
