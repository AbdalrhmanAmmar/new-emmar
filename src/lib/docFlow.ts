/**
 * Shared document-flow logic for the purchase (Procure-to-Pay) and sales
 * (Order-to-Cash) cycles — Egyptian feed trading company.
 *
 * Every screen in both cycles uses these helpers so numbering, tax, stock and
 * journal postings stay consistent and can never contradict each other.
 */
import { getTable, writeTable, uid, type Row } from "@/lib/mockDb";
import { supabase } from "@/integrations/supabase/externalClient";

export const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const money = (v: any) =>
  num(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const qty = (v: any) =>
  num(v).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const tons = (kg: any) => `${(num(kg) / 1000).toLocaleString("en-GB", { maximumFractionDigits: 3 })} طن`;

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => {
  const dt = new Date(date || todayStr());
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
};

export const round2 = (v: number) => Math.round(num(v) * 100) / 100;

/* ================= إعدادات المستندات (مرنة مع النظام المصري) ================= */

export type DocSettings = {
  id: string;
  vat_rate: number;
  weight_tolerance_pct: number;
  price_tolerance_pct: number;
  wht_purchase_pct: number;
  wht_sales_pct: number;
  wht_threshold: number;
  stamp_enabled: boolean;
  stamp_pct: number;
  einvoice_fields_enabled: boolean;
  enforce_credit_limit: boolean;
  block_over_receipt: boolean;
};

export const DEFAULT_SETTINGS: DocSettings = {
  id: "settings",
  vat_rate: 14,
  weight_tolerance_pct: 1,
  price_tolerance_pct: 2,
  wht_purchase_pct: 1,
  wht_sales_pct: 0,
  wht_threshold: 300,
  stamp_enabled: false,
  stamp_pct: 0.1,
  einvoice_fields_enabled: true,
  enforce_credit_limit: true,
  block_over_receipt: true,
};

export function getSettings(): DocSettings {
  const rows = getTable("acc_doc_settings");
  if (!rows.length) {
    writeTable("acc_doc_settings", [{ ...DEFAULT_SETTINGS }]);
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...rows[0] } as DocSettings;
}

export async function saveSettings(patch: Partial<DocSettings>) {
  const current = getSettings();
  const next = { ...current, ...patch };
  writeTable("acc_doc_settings", [next]);
  return next;
}

/* ================= ترقيم المستندات ================= */

/** Sequential document number with hard duplicate protection. */
export function nextDocNo(table: string, column: string, prefix: string, pad = 4) {
  const rows = getTable(table);
  const max = rows.reduce((m, r) => {
    const digits = String(r[column] ?? "").replace(/\D/g, "");
    const n = Number(digits);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  let candidate = max + 1;
  const taken = new Set(rows.map((r) => String(r[column] ?? "")));
  let no = `${prefix}-${String(candidate).padStart(pad, "0")}`;
  while (taken.has(no)) {
    candidate += 1;
    no = `${prefix}-${String(candidate).padStart(pad, "0")}`;
  }
  return no;
}

/* ================= حساب الضريبة والخصم والحسم ================= */

export type CalcLine = {
  quantity_kg: number | string;
  unit_price: number | string;
  discount_pct?: number | string;
  vat_rate?: number | string;
};

export type DocTotals = {
  gross: number;
  discount_total: number;
  subtotal: number;
  vat_total: number;
  wht_total: number;
  stamp_total: number;
  total: number;
  net_payable: number;
};

export function calcTotals(lines: CalcLine[], opts: { wht_pct?: number; stamp?: boolean } = {}): DocTotals {
  const s = getSettings();
  let gross = 0;
  let discount_total = 0;
  let subtotal = 0;
  let vat_total = 0;
  for (const l of lines) {
    const base = num(l.quantity_kg) * num(l.unit_price);
    const disc = round2((base * num(l.discount_pct)) / 100);
    const net = round2(base - disc);
    gross += base;
    discount_total += disc;
    subtotal += net;
    vat_total += round2((net * num(l.vat_rate)) / 100);
  }
  subtotal = round2(subtotal);
  vat_total = round2(vat_total);
  const total = round2(subtotal + vat_total);
  const whtPct = num(opts.wht_pct);
  const wht_total = subtotal >= s.wht_threshold ? round2((subtotal * whtPct) / 100) : 0;
  const stamp_total = opts.stamp && s.stamp_enabled ? round2((subtotal * s.stamp_pct) / 100) : 0;
  return {
    gross: round2(gross),
    discount_total: round2(discount_total),
    subtotal,
    vat_total,
    wht_total,
    stamp_total,
    total,
    net_payable: round2(total - wht_total + stamp_total),
  };
}

/** نسبة السماح في فرق الوزن / السعر */
export function withinTolerance(expected: number, actual: number, pct: number) {
  const e = num(expected);
  if (e === 0) return true;
  return Math.abs(num(actual) - e) / e <= num(pct) / 100;
}

/* ================= المخزون: المتاح والمحجوز ================= */

export function onHandKg(itemId: string, warehouseId?: string | null) {
  return getTable("acc_stock_moves")
    .filter((m) => m.item_id === itemId && (!warehouseId || m.warehouse_id === warehouseId))
    .reduce((s, m) => s + num(m.quantity_kg) * (m.move_type === "out" ? -1 : 1), 0);
}

/** الكمية المحجوزة على أوامر البيع المعتمدة ولم تُسلَّم بعد. */
export function reservedKg(itemId: string, warehouseId?: string | null) {
  const orders = getTable("acc_sales_orders");
  const openIds = new Set(
    orders.filter((o) => o.status === "confirmed" || o.status === "partially_delivered").map((o) => o.id),
  );
  return getTable("acc_sales_order_lines")
    .filter((l) => openIds.has(l.so_id) && l.item_id === itemId && (!warehouseId || l.warehouse_id === warehouseId))
    .reduce((s, l) => s + Math.max(0, num(l.quantity_kg) - num(l.delivered_kg)), 0);
}

export function availableKg(itemId: string, warehouseId?: string | null) {
  return onHandKg(itemId, warehouseId) - reservedKg(itemId, warehouseId);
}

/** متوسط التكلفة المرجح للصنف (يشمل مصاريف الوصول المُحمّلة). */
export function weightedCost(itemId: string) {
  const ins = getTable("acc_stock_moves").filter((m) => m.item_id === itemId && m.move_type !== "out");
  const totalQty = ins.reduce((s, m) => s + num(m.quantity_kg), 0);
  const totalVal = ins.reduce((s, m) => s + num(m.total_cost), 0);
  if (totalQty <= 0) {
    const item = getTable("acc_items").find((i) => i.id === itemId);
    return num(item?.cost_price);
  }
  return round2(totalVal / totalQty);
}

export async function createStockMove(input: {
  move_date: string;
  move_type: "in" | "out";
  item_id: string;
  item_code: string;
  item_name: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity_kg: number;
  unit_cost: number;
  ref_type: string;
  ref_no: string;
  batch_no?: string | null;
  notes?: string | null;
}) {
  const prefix = input.move_type === "in" ? "IN" : "OUT";
  const move_no = nextDocNo("acc_stock_moves", "move_no", prefix, 5);
  return (supabase as any).from("acc_stock_moves").insert({
    id: uid(),
    move_no,
    move_date: input.move_date,
    move_type: input.move_type,
    item_id: input.item_id,
    item_code: input.item_code,
    item_name: input.item_name,
    warehouse_id: input.warehouse_id,
    warehouse_name: input.warehouse_name,
    quantity_kg: round2(input.quantity_kg),
    unit_cost: round2(input.unit_cost),
    total_cost: round2(input.quantity_kg * input.unit_cost),
    batch_no: input.batch_no ?? null,
    ref_type: input.ref_type,
    ref_no: input.ref_no,
    notes: input.notes ?? null,
  });
}

/* ================= الترحيل المحاسبي التلقائي ================= */

export type JournalLine = { code: string; description: string; debit?: number; credit?: number };

export const GL = {
  cash: "1101",
  bank: "1102",
  receivable: "1201",
  vatInput: "1202",
  inventory: "1301",
  payable: "2101",
  vatOutput: "2102",
  grni: "2105",
  whtPayable: "2106",
  revenue: "4101",
  salesReturns: "4103",
  cogs: "5101",
  freight: "5106",
  stockVariance: "5107",
};

/** Creates a balanced, posted journal entry + its ledger lines. */
export async function postJournal(input: {
  date: string;
  description: string;
  source: string;
  ref_no?: string;
  lines: JournalLine[];
}) {
  const coa = getTable("acc_chart_of_accounts");
  const rows = input.lines.filter((l) => num(l.debit) !== 0 || num(l.credit) !== 0);
  if (!rows.length) return null;
  const total_debit = round2(rows.reduce((s, l) => s + num(l.debit), 0));
  const total_credit = round2(rows.reduce((s, l) => s + num(l.credit), 0));
  const entry_no = nextDocNo("acc_journal_entries", "entry_no", "JV", 6);
  const id = uid();
  await (supabase as any).from("acc_journal_entries").insert({
    id,
    entry_no,
    entry_date: input.date,
    description: input.description,
    status: "posted",
    source: input.source,
    ref_no: input.ref_no ?? null,
    total_debit,
    total_credit,
    created_at: input.date,
  });
  const lines = rows.map((l, i) => {
    const account = coa.find((a) => a.code === l.code);
    return {
      id: uid(),
      entry_id: id,
      journal_entry_id: id,
      line_no: i + 1,
      account_id: account?.id ?? null,
      account_code: l.code,
      account_name: account?.name_ar ?? l.code,
      description: l.description,
      debit: round2(num(l.debit)),
      credit: round2(num(l.credit)),
      entry_date: input.date,
      entry_no,
      status: "posted",
      source: input.source,
    };
  });
  await (supabase as any).from("acc_ledger_lines").insert(lines);
  return entry_no;
}

/* ================= مساعدات الحالة ================= */

export const docStatusLabel: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  approved: "معتمد",
  confirmed: "مؤكد",
  selected: "تم الترسية",
  cancelled: "ملغي",
  partially_received: "مستلم جزئياً",
  received: "مستلم بالكامل",
  partially_delivered: "مسلم جزئياً",
  delivered: "مسلم بالكامل",
  partially_billed: "مفوتر جزئياً",
  billed: "مفوتر",
  invoiced: "مفوتر",
  posted: "مُرحّل",
  paid: "مدفوع",
  partially_paid: "مدفوع جزئياً",
  closed: "مقفل",
  expired: "منتهي",
};

export const docStatusColor: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-sky-100 text-sky-700",
  approved: "bg-blue-100 text-blue-700",
  confirmed: "bg-blue-100 text-blue-700",
  selected: "bg-indigo-100 text-indigo-700",
  cancelled: "bg-rose-100 text-rose-700",
  partially_received: "bg-amber-100 text-amber-700",
  received: "bg-emerald-100 text-emerald-700",
  partially_delivered: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  partially_billed: "bg-amber-100 text-amber-700",
  billed: "bg-emerald-100 text-emerald-700",
  invoiced: "bg-emerald-100 text-emerald-700",
  posted: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  partially_paid: "bg-amber-100 text-amber-700",
  closed: "bg-slate-200 text-slate-700",
  expired: "bg-rose-100 text-rose-700",
};

/** Rolls a parent document status from its line quantities. */
export function rollupStatus(
  lines: Array<{ quantity_kg: any; done_kg: any }>,
  partial: string,
  done: string,
  open: string,
) {
  const ordered = lines.reduce((s, l) => s + num(l.quantity_kg), 0);
  const completed = lines.reduce((s, l) => s + num(l.done_kg), 0);
  if (completed <= 0) return open;
  if (completed + 0.001 >= ordered) return done;
  return partial;
}

export type Party = Row;

/** رصيد العميل الحالي (افتتاحي + فواتير غير محصلة). */
export function customerBalance(customerName: string) {
  const opening = num(getTable("acc_customers").find((c) => c.name_ar === customerName)?.opening_balance);
  const open = getTable("acc_sales_invoices")
    .filter((i) => i.buyer_name === customerName)
    .reduce((s, i) => s + num(i.balance), 0);
  return round2(opening + open);
}
