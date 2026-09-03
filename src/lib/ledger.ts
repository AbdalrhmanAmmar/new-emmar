import type { DbShape } from "@/lib/mockDb";
import { moveLineBaseQty, moveSign } from "@/lib/inventory";
import { purchaseTotals } from "@/lib/purchases";
import { invoiceTotalsOf, lineTotals } from "@/lib/sales";
import { returnTotals } from "@/lib/returns";
import { stockValueAt } from "@/lib/pnl";

/* ============================================================
 * محرك القيود المحاسبية (Double Entry) — يبنى قيود اليومية
 * من كل مستندات البرنامج (مبيعات / مشتريات / مرتجعات / سندات
 * / مصروفات / تحويلات / تسويات مخزنية) ثم تُبنى منه:
 * دفتر اليومية، دفتر الأستاذ، ميزان المراجعة، المركز المالى،
 * الإقرار الضريبى.
 * ============================================================ */

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface Account {
  code: string;
  name: string;
  type: AccountType;
}

export const ACCOUNTS: Record<string, Account> = {
  cash: { code: "1101", name: "النقدية والخزائن والبنوك", type: "asset" },
  ar: { code: "1201", name: "العملاء (مدينون)", type: "asset" },
  inventory: { code: "1301", name: "المخزون", type: "asset" },
  vatInput: { code: "1401", name: "ضريبة مشتريات (خصم)", type: "asset" },
  staffAdvance: { code: "1501", name: "سلف وعهد الموظفين", type: "asset" },
  ap: { code: "2101", name: "الموردون (دائنون)", type: "liability" },
  vatOutput: { code: "2201", name: "ضريبة مبيعات مستحقة", type: "liability" },
  capital: { code: "3101", name: "رأس المال والأرصدة الافتتاحية", type: "equity" },
  sales: { code: "4101", name: "إيرادات المبيعات", type: "revenue" },
  salesCharges: { code: "4102", name: "إيرادات بنود إضافية (تحميل / نقل)", type: "revenue" },
  otherRevenue: { code: "4201", name: "إيرادات أخرى ومتنوعة", type: "revenue" },
  salesReturns: { code: "4301", name: "مرتجعات المبيعات", type: "expense" },
  cogs: { code: "5101", name: "تكلفة المبيعات", type: "expense" },
  salaries: { code: "5201", name: "الرواتب والأجور", type: "expense" },
  expenses: { code: "5301", name: "مصروفات عامة ونثريات", type: "expense" },
  bankFees: { code: "5401", name: "رسوم ومصاريف بنكية", type: "expense" },
  stockAdjust: { code: "5501", name: "تسويات وفروقات المخزون", type: "expense" },
};

export type AccountKey = keyof typeof ACCOUNTS;

export interface JournalLine {
  account: AccountKey;
  code: string;
  name: string;
  debit: number;
  credit: number;
  /** الطرف (عميل / مورد / موظف / خزنة) لعرضه فى الأستاذ */
  party?: string;
}

export type JournalSource =
  | "sales"
  | "purchase"
  | "salesReturn"
  | "purchaseReturn"
  | "receipt"
  | "payment"
  | "expense"
  | "transfer"
  | "stock"
  | "opening";

export const SOURCE_LABEL: Record<JournalSource, string> = {
  sales: "فاتورة مبيعات",
  purchase: "فاتورة مشتريات",
  salesReturn: "مرتجع مبيعات",
  purchaseReturn: "مرتجع مشتريات",
  receipt: "سند قبض",
  payment: "سند صرف",
  expense: "مصروف",
  transfer: "تحويل بين الخزائن",
  stock: "تسوية مخزنية",
  opening: "رصيد افتتاحى",
};

export interface JournalEntry {
  id: string;
  date: string;
  no: string;
  source: JournalSource;
  description: string;
  lines: JournalLine[];
  debit: number;
  credit: number;
}

const L = (account: AccountKey, debit: number, credit: number, party?: string): JournalLine => ({
  account,
  code: ACCOUNTS[account].code,
  name: ACCOUNTS[account].name,
  debit: Math.max(0, debit),
  credit: Math.max(0, credit),
  party,
});

function entry(
  id: string,
  date: string,
  no: string,
  source: JournalSource,
  description: string,
  lines: JournalLine[],
): JournalEntry {
  const kept = lines.filter((l) => l.debit > 0.0001 || l.credit > 0.0001);
  return {
    id,
    date: String(date).slice(0, 10),
    no,
    source,
    description,
    lines: kept,
    debit: kept.reduce((s, l) => s + l.debit, 0),
    credit: kept.reduce((s, l) => s + l.credit, 0),
  };
}

const nameOf = (list: { id: string; name: string }[], id: string | null | undefined) =>
  (id && list.find((x) => x.id === id)?.name) || "";

/** يبنى كل قيود اليومية من مستندات النظام (بدون فلترة تاريخ) */
export function buildJournal(data: DbShape): JournalEntry[] {
  const out: JournalEntry[] = [];

  /* أرصدة افتتاحية للخزائن */
  for (const safe of data.safes) {
    const amount = Number(safe.openingBalance || 0);
    if (!amount) continue;
    out.push(
      entry(`open-${safe.id}`, "2000-01-01", safe.code, "opening", `رصيد افتتاحى — ${safe.name}`, [
        L("cash", amount, 0, safe.name),
        L("capital", 0, amount),
      ]),
    );
  }

  /* فواتير المبيعات */
  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted") continue;
    const t = invoiceTotalsOf(data, inv);
    const paid = Math.min(t.paid, t.total);
    const party = inv.customerName || "عميل نقدى";
    out.push(
      entry(`si-${inv.id}`, inv.date, inv.no, "sales", `فاتورة مبيعات ${inv.no} — ${party}`, [
        L("cash", paid, 0, nameOf(data.safes, inv.safeId) || "الخزينة"),
        L("ar", t.total - paid, 0, party),
        L("sales", 0, t.net),
        L("salesCharges", 0, t.charges),
        L("vatOutput", 0, t.tax),
      ]),
    );
  }

  /* فواتير المشتريات */
  for (const inv of data.purchaseInvoices) {
    if (inv.status !== "posted") continue;
    const t = purchaseTotals(inv);
    const paid = Math.min(t.paid, t.total);
    const party = inv.supplierName || "مورد";
    out.push(
      entry(`pi-${inv.id}`, inv.date, inv.no, "purchase", `فاتورة مشتريات ${inv.no} — ${party}`, [
        L("inventory", t.net, 0),
        L("vatInput", t.tax, 0),
        L("cash", 0, paid, nameOf(data.safes, inv.safeId) || "الخزينة"),
        L("ap", 0, t.total - paid, party),
      ]),
    );
  }

  /* المرتجعات */
  for (const doc of data.returns) {
    if (doc.status !== "posted") continue;
    const t = returnTotals(doc.lines);
    const cash = doc.settle === "cash" ? t.total : 0;
    const party = doc.partyName || "";
    if (doc.kind === "sales") {
      out.push(
        entry(`sr-${doc.id}`, doc.date, doc.no, "salesReturn", `مرتجع مبيعات ${doc.no} — ${party}`, [
          L("salesReturns", t.net, 0),
          L("vatOutput", t.tax, 0),
          L("cash", 0, cash, nameOf(data.safes, doc.safeId) || "الخزينة"),
          L("ar", 0, t.total - cash, party),
        ]),
      );
    } else {
      out.push(
        entry(`pr-${doc.id}`, doc.date, doc.no, "purchaseReturn", `مرتجع مشتريات ${doc.no} — ${party}`, [
          L("cash", cash, 0, nameOf(data.safes, doc.safeId) || "الخزينة"),
          L("ap", t.total - cash, 0, party),
          L("inventory", 0, t.net),
          L("vatInput", 0, t.tax),
        ]),
      );
    }
  }

  /* سندات القبض والصرف */
  for (const v of data.vouchers) {
    if (v.status !== "posted") continue;
    const amount = Number(v.amount || 0);
    const safe = nameOf(data.safes, v.safeId) || "الخزينة";
    const party =
      v.partyType === "customer"
        ? nameOf(data.customers, v.partyId)
        : v.partyType === "supplier"
          ? nameOf(data.suppliers, v.partyId)
          : v.note || "متنوعة";
    if (v.kind === "receipt") {
      const contra: AccountKey = v.partyType === "customer" ? "ar" : "otherRevenue";
      out.push(
        entry(`vr-${v.id}`, v.date, v.no, "receipt", `سند قبض ${v.no} — ${party}`, [
          L("cash", amount, 0, safe),
          L(contra, 0, amount, party),
        ]),
      );
    } else {
      const contra: AccountKey = v.partyType === "supplier" ? "ap" : "expenses";
      out.push(
        entry(`vp-${v.id}`, v.date, v.no, "payment", `سند صرف ${v.no} — ${party}`, [
          L(contra, amount, 0, party),
          L("cash", 0, amount, safe),
        ]),
      );
    }
  }

  /* المصروفات والرواتب والسلف */
  for (const ex of data.expenses) {
    if (ex.status !== "posted") continue;
    const amount = Number(ex.amount || 0);
    const item = data.expenseItems.find((i) => i.id === ex.itemId);
    const account: AccountKey =
      ex.kind === "salary" ? "salaries" : ex.kind === "advance" ? "staffAdvance" : "expenses";
    const beneficiary = ex.beneficiary || nameOf(data.employees, ex.employeeId) || item?.name || "";
    out.push(
      entry(`ex-${ex.id}`, ex.date, ex.no, "expense", `${item?.name ?? "مصروف"} ${ex.no} — ${beneficiary}`, [
        L(account, amount, 0, beneficiary),
        L("cash", 0, amount, nameOf(data.safes, ex.safeId) || "الخزينة"),
      ]),
    );
  }

  /* التحويلات بين الخزائن (الرسوم مصروف بنكى) */
  for (const t of data.transfers) {
    if (t.status !== "posted") continue;
    const amount = Number(t.amount || 0);
    const fee = Number(t.fee || 0);
    const from = nameOf(data.safes, t.fromSafeId);
    const to = nameOf(data.safes, t.toSafeId);
    out.push(
      entry(`tr-${t.id}`, t.date, t.no, "transfer", `تحويل ${t.no} — من ${from} إلى ${to}`, [
        L("cash", amount, 0, to),
        L("bankFees", fee, 0),
        L("cash", 0, amount + fee, from),
      ]),
    );
  }

  /* التسويات المخزنية (جرد / تسوية يدوية) */
  for (const move of data.stockMoves) {
    if (move.status !== "posted" || move.kind !== "adjust") continue;
    let value = 0;
    for (const line of move.lines) value += moveLineBaseQty(line) * Number(line.cost || 0);
    const surplus = moveSign(move.kind) >= 0;
    out.push(
      entry(`sm-${move.id}`, move.date, move.no, "stock", `تسوية مخزنية ${move.no}`, [
        L("inventory", surplus ? value : 0, surplus ? 0 : value),
        L("stockAdjust", surplus ? 0 : value, surplus ? value : 0),
      ]),
    );
  }

  return out.sort((a, b) => (a.date === b.date ? a.no.localeCompare(b.no) : a.date.localeCompare(b.date)));
}

export const inRange = (date: string, from: string, to: string) => {
  const d = String(date).slice(0, 10);
  return d >= from && d <= to;
};

export interface TrialRow {
  account: AccountKey;
  code: string;
  name: string;
  type: AccountType;
  openingDebit: number;
  openingCredit: number;
  debit: number;
  credit: number;
  balanceDebit: number;
  balanceCredit: number;
}

/** ميزان المراجعة: أرصدة افتتاحية + حركة الفترة + الرصيد الختامى */
export function trialBalance(entries: JournalEntry[], from: string, to: string): TrialRow[] {
  const map = new Map<AccountKey, TrialRow>();
  const row = (key: AccountKey) => {
    let r = map.get(key);
    if (!r) {
      const acc = ACCOUNTS[key];
      r = {
        account: key,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        openingDebit: 0,
        openingCredit: 0,
        debit: 0,
        credit: 0,
        balanceDebit: 0,
        balanceCredit: 0,
      };
      map.set(key, r);
    }
    return r;
  };

  for (const e of entries) {
    const before = e.date < from;
    const within = inRange(e.date, from, to);
    if (!before && !within) continue;
    for (const l of e.lines) {
      const r = row(l.account);
      if (before) {
        r.openingDebit += l.debit;
        r.openingCredit += l.credit;
      } else {
        r.debit += l.debit;
        r.credit += l.credit;
      }
    }
  }

  const rows = [...map.values()];
  for (const r of rows) {
    const net = r.openingDebit - r.openingCredit + r.debit - r.credit;
    r.balanceDebit = net > 0 ? net : 0;
    r.balanceCredit = net < 0 ? -net : 0;
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

export interface LedgerLine {
  date: string;
  no: string;
  source: JournalSource;
  description: string;
  party: string;
  debit: number;
  credit: number;
  balance: number;
}

/** دفتر الأستاذ لحساب معين مع رصيد ما قبل الفترة */
export function accountLedger(entries: JournalEntry[], account: AccountKey, from: string, to: string) {
  let opening = 0;
  const lines: LedgerLine[] = [];
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.account !== account) continue;
      if (e.date < from) {
        opening += l.debit - l.credit;
      } else if (inRange(e.date, from, to)) {
        lines.push({
          date: e.date,
          no: e.no,
          source: e.source,
          description: e.description,
          party: l.party ?? "",
          debit: l.debit,
          credit: l.credit,
          balance: 0,
        });
      }
    }
  }
  let running = opening;
  for (const l of lines) {
    running += l.debit - l.credit;
    l.balance = running;
  }
  return {
    opening,
    lines,
    debit: lines.reduce((s, l) => s + l.debit, 0),
    credit: lines.reduce((s, l) => s + l.credit, 0),
    closing: running,
  };
}

export interface BalanceSheetResult {
  assets: { label: string; value: number }[];
  liabilities: { label: string; value: number }[];
  equity: { label: string; value: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  retained: number;
  difference: number;
}

/** المركز المالى حتى تاريخ (المخزون بالتقييم الفعلى) */
export function balanceSheet(data: DbShape, entries: JournalEntry[], asOf: string): BalanceSheetResult {
  const rows = trialBalance(entries, "0000-01-01", asOf);
  const bal = (key: AccountKey) => {
    const r = rows.find((x) => x.account === key);
    return r ? r.openingDebit - r.openingCredit + r.debit - r.credit : 0;
  };

  const inventoryValue = stockValueAt(data, asOf);
  const assets = [
    { label: ACCOUNTS.cash.name, value: bal("cash") },
    { label: ACCOUNTS.ar.name, value: bal("ar") },
    { label: ACCOUNTS.inventory.name, value: inventoryValue },
    { label: ACCOUNTS.vatInput.name, value: bal("vatInput") },
    { label: ACCOUNTS.staffAdvance.name, value: bal("staffAdvance") },
  ].filter((r) => Math.abs(r.value) > 0.01);

  const liabilities = [
    { label: ACCOUNTS.ap.name, value: -bal("ap") },
    { label: ACCOUNTS.vatOutput.name, value: -bal("vatOutput") },
  ].filter((r) => Math.abs(r.value) > 0.01);

  const capital = -bal("capital");
  const revenue = -(bal("sales") + bal("salesCharges") + bal("otherRevenue"));
  const costs =
    bal("salesReturns") + bal("salaries") + bal("expenses") + bal("bankFees") + bal("stockAdjust");
  /* تكلفة المبيعات = مشتريات المخزون المستهلكة = ما تم شراؤه − المخزون الحالى */
  const purchasedIntoStock = bal("inventory");
  const cogs = Math.max(0, purchasedIntoStock - inventoryValue);
  const retained = revenue - costs - cogs;

  const equity = [
    { label: ACCOUNTS.capital.name, value: capital },
    { label: "الأرباح المحتجزة (نتيجة النشاط)", value: retained },
  ].filter((r) => Math.abs(r.value) > 0.01);

  const totalAssets = assets.reduce((s, r) => s + r.value, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.value, 0);
  const totalEquity = equity.reduce((s, r) => s + r.value, 0);

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    retained,
    difference: totalAssets - (totalLiabilities + totalEquity),
  };
}

/* ============================================================
 * الإقرار الضريبى (ضريبة القيمة المضافة)
 * ============================================================ */
export interface VatResult {
  salesNet: number;
  outputTax: number;
  salesReturnsNet: number;
  outputTaxReturns: number;
  purchasesNet: number;
  inputTax: number;
  purchaseReturnsNet: number;
  inputTaxReturns: number;
  netOutput: number;
  netInput: number;
  due: number;
  monthly: { month: string; output: number; input: number; due: number }[];
}

export function vatReturn(data: DbShape, from: string, to: string): VatResult {
  const monthly = new Map<string, { month: string; output: number; input: number; due: number }>();
  const bucket = (date: string) => {
    const m = String(date).slice(0, 7);
    let r = monthly.get(m);
    if (!r) {
      r = { month: m, output: 0, input: 0, due: 0 };
      monthly.set(m, r);
    }
    return r;
  };

  let salesNet = 0;
  let outputTax = 0;
  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted" || !inRange(inv.date, from, to)) continue;
    const t = invoiceTotalsOf(data, inv);
    salesNet += t.net;
    outputTax += t.tax;
    bucket(inv.date).output += t.tax;
  }

  let purchasesNet = 0;
  let inputTax = 0;
  for (const inv of data.purchaseInvoices) {
    if (inv.status !== "posted" || !inRange(inv.date, from, to)) continue;
    const t = purchaseTotals(inv);
    purchasesNet += t.net;
    inputTax += t.tax;
    bucket(inv.date).input += t.tax;
  }

  let salesReturnsNet = 0;
  let outputTaxReturns = 0;
  let purchaseReturnsNet = 0;
  let inputTaxReturns = 0;
  for (const doc of data.returns) {
    if (doc.status !== "posted" || !inRange(doc.date, from, to)) continue;
    const t = returnTotals(doc.lines);
    if (doc.kind === "sales") {
      salesReturnsNet += t.net;
      outputTaxReturns += t.tax;
      bucket(doc.date).output -= t.tax;
    } else {
      purchaseReturnsNet += t.net;
      inputTaxReturns += t.tax;
      bucket(doc.date).input -= t.tax;
    }
  }

  const netOutput = outputTax - outputTaxReturns;
  const netInput = inputTax - inputTaxReturns;
  const rows = [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month));
  for (const r of rows) r.due = r.output - r.input;

  return {
    salesNet,
    outputTax,
    salesReturnsNet,
    outputTaxReturns,
    purchasesNet,
    inputTax,
    purchaseReturnsNet,
    inputTaxReturns,
    netOutput,
    netInput,
    due: netOutput - netInput,
    monthly: rows,
  };
}

/* ============================================================
 * أرصدة العملاء والموردين + أعمار الأرصدة
 * ============================================================ */
export interface PartyBalanceRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  invoices: number;
  total: number;
  paid: number;
  returns: number;
  vouchers: number;
  balance: number;
  lastDate: string;
  b0: number;
  b30: number;
  b60: number;
  b90: number;
}

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()) / 86400000);

function partyBalances(
  data: DbShape,
  kind: "customer" | "supplier",
  to: string,
): PartyBalanceRow[] {
  const parties = kind === "customer" ? data.customers : data.suppliers;
  const rows = new Map<string, PartyBalanceRow>();
  for (const p of parties) {
    rows.set(p.id, {
      id: p.id,
      code: p.code,
      name: p.name,
      phone: p.phone,
      invoices: 0,
      total: 0,
      paid: 0,
      returns: 0,
      vouchers: 0,
      balance: 0,
      lastDate: "",
      b0: 0,
      b30: 0,
      b60: 0,
      b90: 0,
    });
  }

  const bucketOf = (row: PartyBalanceRow, date: string, amount: number) => {
    const age = daysBetween(to, date);
    if (age <= 30) row.b0 += amount;
    else if (age <= 60) row.b30 += amount;
    else if (age <= 90) row.b60 += amount;
    else row.b90 += amount;
  };

  const invoices = kind === "customer" ? data.salesInvoices : data.purchaseInvoices;
  for (const inv of invoices) {
    const partyId = kind === "customer" ? (inv as { customerId: string | null }).customerId : (inv as { supplierId: string | null }).supplierId;
    if (!partyId || inv.status !== "posted" || String(inv.date).slice(0, 10) > to) continue;
    const row = rows.get(partyId);
    if (!row) continue;
    const t =
      kind === "customer"
        ? invoiceTotalsOf(data, inv as Parameters<typeof invoiceTotalsOf>[1])
        : purchaseTotals(inv as Parameters<typeof purchaseTotals>[0]);
    row.invoices += 1;
    row.total += t.total;
    row.paid += Math.min(t.paid, t.total);
    if (String(inv.date) > row.lastDate) row.lastDate = String(inv.date).slice(0, 10);
    bucketOf(row, String(inv.date).slice(0, 10), t.total - Math.min(t.paid, t.total));
  }

  for (const doc of data.returns) {
    if (doc.status !== "posted" || !doc.partyId || String(doc.date).slice(0, 10) > to) continue;
    if ((kind === "customer") !== (doc.kind === "sales")) continue;
    const row = rows.get(doc.partyId);
    if (!row) continue;
    const t = returnTotals(doc.lines);
    if (doc.settle === "credit") row.returns += t.total;
  }

  for (const v of data.vouchers) {
    if (v.status !== "posted" || !v.partyId || String(v.date).slice(0, 10) > to) continue;
    if (v.partyType !== kind) continue;
    const row = rows.get(v.partyId);
    if (!row) continue;
    const expected = kind === "customer" ? "receipt" : "payment";
    if (v.kind === expected) row.vouchers += Number(v.amount || 0);
  }

  for (const row of rows.values()) {
    row.balance = row.total - row.paid - row.returns - row.vouchers;
    const settled = row.returns + row.vouchers;
    let rest = settled;
    for (const key of ["b90", "b60", "b30", "b0"] as const) {
      const take = Math.min(rest, row[key]);
      row[key] -= take;
      rest -= take;
    }
  }

  return [...rows.values()]
    .filter((r) => r.invoices > 0 || Math.abs(r.balance) > 0.01)
    .sort((a, b) => b.balance - a.balance);
}

export const receivables = (data: DbShape, to: string) => partyBalances(data, "customer", to);
export const payables = (data: DbShape, to: string) => partyBalances(data, "supplier", to);

/* ============================================================
 * ربحية الأصناف: مبيعات الصنف مقابل تكلفته
 * ============================================================ */
export interface ProductProfitRow {
  id: string;
  code: string;
  name: string;
  qty: number;
  revenue: number;
  discount: number;
  cost: number;
  profit: number;
  marginPct: number;
  avgPrice: number;
  invoices: number;
}

export function productProfit(data: DbShape, from: string, to: string): ProductProfitRow[] {
  const map = new Map<string, ProductProfitRow>();
  const rowFor = (productId: string, code: string, name: string) => {
    let r = map.get(productId);
    if (!r) {
      r = {
        id: productId,
        code,
        name,
        qty: 0,
        revenue: 0,
        discount: 0,
        cost: 0,
        profit: 0,
        marginPct: 0,
        avgPrice: 0,
        invoices: 0,
      };
      map.set(productId, r);
    }
    return r;
  };

  const costOf = (productId: string) => Number(data.products.find((p) => p.id === productId)?.cost || 0);

  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted" || !inRange(inv.date, from, to)) continue;
    for (const line of inv.lines) {
      const t = lineTotals(line);
      const r = rowFor(line.productId, line.code, line.name);
      const baseQty = Number(line.qty || 0) * Number(line.unitFactor || 1);
      r.qty += baseQty;
      r.revenue += t.net;
      r.discount += t.discount;
      r.cost += baseQty * costOf(line.productId);
      r.invoices += 1;
    }
  }

  for (const doc of data.returns) {
    if (doc.status !== "posted" || doc.kind !== "sales" || !inRange(doc.date, from, to)) continue;
    for (const line of doc.lines) {
      const t = lineTotals(line);
      const r = rowFor(line.productId, line.code, line.name);
      const baseQty = Number(line.qty || 0) * Number(line.unitFactor || 1);
      r.qty -= baseQty;
      r.revenue -= t.net;
      r.cost -= baseQty * costOf(line.productId);
    }
  }

  const rows = [...map.values()];
  for (const r of rows) {
    r.profit = r.revenue - r.cost;
    r.marginPct = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
    r.avgPrice = r.qty > 0 ? r.revenue / r.qty : 0;
  }
  return rows.sort((a, b) => b.profit - a.profit);
}

/* ============================================================
 * أرصدة الخزائن والبنوك حتى تاريخ
 * ============================================================ */
export interface SafeBalanceRow {
  id: string;
  code: string;
  name: string;
  type: string;
  opening: number;
  inflow: number;
  outflow: number;
  balance: number;
}

export function safeBalances(data: DbShape, from: string, to: string): SafeBalanceRow[] {
  const rows = new Map<string, SafeBalanceRow>();
  for (const s of data.safes) {
    rows.set(s.id, {
      id: s.id,
      code: s.code,
      name: s.name,
      type: s.type,
      opening: Number(s.openingBalance || 0),
      inflow: 0,
      outflow: 0,
      balance: 0,
    });
  }

  const apply = (safeId: string | null | undefined, date: string, inflow: number, outflow: number) => {
    if (!safeId) return;
    const row = rows.get(safeId);
    if (!row) return;
    const d = String(date).slice(0, 10);
    if (d > to) return;
    if (d < from) {
      row.opening += inflow - outflow;
      return;
    }
    row.inflow += inflow;
    row.outflow += outflow;
  };

  for (const v of data.vouchers) {
    if (v.status !== "posted") continue;
    const amount = Number(v.amount || 0);
    apply(v.safeId, v.date, v.kind === "receipt" ? amount : 0, v.kind === "payment" ? amount : 0);
  }
  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted") continue;
    const t = invoiceTotalsOf(data, inv);
    apply(inv.safeId, inv.date, Math.min(t.paid, t.total), 0);
  }
  for (const inv of data.purchaseInvoices) {
    if (inv.status !== "posted") continue;
    const t = purchaseTotals(inv);
    apply(inv.safeId, inv.date, 0, Math.min(t.paid, t.total));
  }
  for (const doc of data.returns) {
    if (doc.status !== "posted" || doc.settle !== "cash") continue;
    const t = returnTotals(doc.lines);
    apply(doc.safeId, doc.date, doc.kind === "purchase" ? t.total : 0, doc.kind === "sales" ? t.total : 0);
  }
  for (const ex of data.expenses) {
    if (ex.status !== "posted") continue;
    apply(ex.safeId, ex.date, 0, Number(ex.amount || 0));
  }
  for (const t of data.transfers) {
    if (t.status !== "posted") continue;
    apply(t.toSafeId, t.date, Number(t.amount || 0), 0);
    apply(t.fromSafeId, t.date, 0, Number(t.amount || 0) + Number(t.fee || 0));
  }

  const list = [...rows.values()];
  for (const r of list) r.balance = r.opening + r.inflow - r.outflow;
  return list.sort((a, b) => a.code.localeCompare(b.code));
}
