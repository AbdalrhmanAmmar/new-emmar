import type { DbShape } from "@/lib/mockDb";
import { moveLineBaseQty, moveSign } from "@/lib/inventory";
import { purchaseTotals } from "@/lib/purchases";
import { invoiceTotalsOf } from "@/lib/sales";
import { returnTotals } from "@/lib/returns";

/* ============================================================
 * حساب الأرباح والخسائر (Profit & Loss)
 * الإيرادات بعد الخصومات وبدون الضريبة − تكلفة المبيعات − كل المصروفات
 * ============================================================ */

export interface PnlGroupRow {
  key: string;
  label: string;
  amount: number;
  count: number;
}

export interface PnlResult {
  /** إجمالى المبيعات قبل الخصم */
  salesGross: number;
  salesDiscount: number;
  /** صافى المبيعات بعد الخصم وبدون ضريبة */
  salesNet: number;
  salesTax: number;
  salesCharges: number;
  salesTotal: number;
  salesCount: number;
  salesCollected: number;
  salesRemaining: number;

  /** مرتجعات المبيعات (بدون ضريبة) */
  salesReturns: number;
  salesReturnsTax: number;
  /** صافى الإيرادات = صافى المبيعات + البنود الإضافية − المرتجعات */
  revenue: number;

  purchasesGross: number;
  purchasesDiscount: number;
  purchasesNet: number;
  purchasesTax: number;
  purchasesCount: number;
  purchaseReturns: number;
  purchaseReturnsTax: number;
  netPurchases: number;

  openingStock: number;
  closingStock: number;
  /** تكلفة المبيعات = صافى المشتريات + مخزون أول − مخزون آخر */
  cogs: number;

  grossProfit: number;
  grossMarginPct: number;

  expenses: number;
  expenseGroups: PnlGroupRow[];
  advances: number;
  transferFees: number;
  totalCosts: number;

  netProfit: number;
  netMarginPct: number;

  taxDue: number;
}

const inR = (date: string | undefined | null, from: string, to: string) => {
  if (!date) return false;
  const d = String(date).slice(0, 10);
  return d >= from && d <= to;
};

/** قيمة المخزون بالتكلفة الحالية للأصناف حتى تاريخ معين */
export function stockValueAt(data: DbShape, upToDate: string): number {
  const qty = new Map<string, number>();
  for (const move of data.stockMoves) {
    if (move.status !== "posted") continue;
    if (String(move.date).slice(0, 10) > upToDate) continue;
    for (const line of move.lines) {
      const q = moveLineBaseQty(line);
      if (move.kind === "transfer") continue;
      const sign = moveSign(move.kind) < 0 ? -1 : 1;
      qty.set(line.productId, (qty.get(line.productId) ?? 0) + sign * q);
    }
  }
  let value = 0;
  for (const product of data.products) {
    value += (qty.get(product.id) ?? 0) * Number(product.cost || 0);
  }
  return value;
}

function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** يحسب قائمة الأرباح والخسائر لفترة (يستخدم قاعدة البيانات الكاملة) */
export function profitAndLoss(data: DbShape, from: string, to: string): PnlResult {
  let salesGross = 0;
  let salesDiscount = 0;
  let salesNet = 0;
  let salesTax = 0;
  let salesCharges = 0;
  let salesTotal = 0;
  let salesCollected = 0;
  let salesCount = 0;

  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted" || !inR(inv.date, from, to)) continue;
    const t = invoiceTotalsOf(data, inv);
    salesGross += t.gross;
    salesDiscount += t.discount;
    salesNet += t.net;
    salesTax += t.tax;
    salesCharges += t.charges;
    salesTotal += t.total;
    salesCollected += t.paid;
    salesCount += 1;
  }

  let salesReturns = 0;
  let salesReturnsTax = 0;
  let purchaseReturns = 0;
  let purchaseReturnsTax = 0;
  for (const doc of data.returns) {
    if (doc.status === "cancelled" || !inR(doc.date, from, to)) continue;
    const t = returnTotals(doc.lines);
    if (doc.kind === "sales") {
      salesReturns += t.net;
      salesReturnsTax += t.tax;
    } else {
      purchaseReturns += t.net;
      purchaseReturnsTax += t.tax;
    }
  }

  let purchasesGross = 0;
  let purchasesDiscount = 0;
  let purchasesNet = 0;
  let purchasesTax = 0;
  let purchasesCount = 0;
  for (const inv of data.purchaseInvoices) {
    if (inv.status !== "posted" || !inR(inv.date, from, to)) continue;
    const t = purchaseTotals(inv);
    purchasesGross += t.gross;
    purchasesDiscount += t.discount;
    purchasesNet += t.net;
    purchasesTax += t.tax;
    purchasesCount += 1;
  }

  const openingStock = stockValueAt(data, dayBefore(from));
  const closingStock = stockValueAt(data, to);
  const netPurchases = purchasesNet - purchaseReturns;
  const cogs = netPurchases + openingStock - closingStock;

  const revenue = salesNet + salesCharges - salesReturns;
  const grossProfit = revenue - cogs;

  /* المصروفات: كل ما يتم صرفه فعلياً (رواتب، نثريات، مصروفات عامة) — السلف مستحقة على الموظف فلا تُحمّل */
  const groups = new Map<string, PnlGroupRow>();
  let expenses = 0;
  let advances = 0;
  for (const ex of data.expenses) {
    if (ex.status !== "posted" || !inR(ex.date, from, to)) continue;
    const amount = Number(ex.amount || 0);
    if (ex.kind === "advance") {
      advances += amount;
      continue;
    }
    const item = data.expenseItems.find((i) => i.id === ex.itemId);
    const key = item?.id ?? "other";
    const row = groups.get(key) ?? { key, label: item?.name ?? "مصروفات أخرى", amount: 0, count: 0 };
    row.amount += amount;
    row.count += 1;
    groups.set(key, row);
    expenses += amount;
  }

  let transferFees = 0;
  for (const t of data.transfers) {
    if (t.status !== "posted" || !inR(t.date, from, to)) continue;
    transferFees += Number(t.fee || 0);
  }

  const totalCosts = cogs + expenses + transferFees;
  const netProfit = revenue - totalCosts;

  return {
    salesGross,
    salesDiscount,
    salesNet,
    salesTax,
    salesCharges,
    salesTotal,
    salesCount,
    salesCollected,
    salesRemaining: Math.max(0, salesTotal - salesCollected),
    salesReturns,
    salesReturnsTax,
    revenue,
    purchasesGross,
    purchasesDiscount,
    purchasesNet,
    purchasesTax,
    purchasesCount,
    purchaseReturns,
    purchaseReturnsTax,
    netPurchases,
    openingStock,
    closingStock,
    cogs,
    grossProfit,
    grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    expenses,
    expenseGroups: [...groups.values()].sort((a, b) => b.amount - a.amount),
    advances,
    transferFees,
    totalCosts,
    netProfit,
    netMarginPct: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    taxDue: salesTax - salesReturnsTax - (purchasesTax - purchaseReturnsTax),
  };
}
