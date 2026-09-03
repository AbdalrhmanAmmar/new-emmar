import { orgSettings } from "@/lib/mockDb";
import type { DbShape, InvoiceCharge, Product, SalesInvoice, SalesLine } from "@/lib/mockDb";

/** نسبة الضريبة الفعلية للسطر: لو الضريبة ملغية من الإعدادات (0) لا تُحسب على أى فاتورة */
export function effectiveTaxRate(lineRate?: number | null): number {
  try {
    if (Number(orgSettings().vatRate || 0) <= 0) return 0;
  } catch {
    /* الإعدادات غير متاحة — استخدم نسبة السطر */
  }
  return Number(lineRate || 0);
}

export interface LineTotals {
  gross: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
}

export function lineTotals(line: SalesLine): LineTotals {
  const gross = Number(line.qty || 0) * Number(line.price || 0);
  const discount = Math.min(gross, (gross * Number(line.discountPct || 0)) / 100 + Number(line.discountAmt || 0));
  const net = gross - discount;
  const tax = (net * effectiveTaxRate(line.taxRate)) / 100;
  return { gross, discount, net, tax, total: net + tax };
}

export interface InvoiceTotals extends LineTotals {
  codeDiscount: number;
  /** إجمالى البنود الإضافية (تحميل / نقل ... ) */
  charges: number;
  paid: number;
  remaining: number;
}

export function invoiceTotals(inv: {
  lines: SalesLine[];
  payMethod: SalesInvoice["payMethod"];
  payCash: number;
  payCard: number;
  discountCode?: string;
  codePercent?: number;
  charges?: InvoiceCharge[];
}): InvoiceTotals {
  let gross = 0;
  let lineDiscount = 0;
  let net = 0;
  let tax = 0;
  for (const line of inv.lines) {
    const t = lineTotals(line);
    gross += t.gross;
    lineDiscount += t.discount;
    net += t.net;
    tax += t.tax;
  }
  const codeDiscount = (net * Number(inv.codePercent || 0)) / 100;
  const factor = net > 0 ? (net - codeDiscount) / net : 1;
  net -= codeDiscount;
  tax *= factor;
  const charges = (inv.charges ?? []).reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const total = net + tax + charges;
  const paid = paidAmount(inv.payMethod, inv.payCash, inv.payCard, total);
  return {
    gross,
    discount: lineDiscount + codeDiscount,
    net,
    tax,
    total,
    codeDiscount,
    charges,
    paid,
    remaining: Math.max(0, total - paid),
  };
}


export function paidAmount(
  method: SalesInvoice["payMethod"],
  payCash: number,
  payCard: number,
  total: number,
): number {
  if (method === "credit") return 0;
  if (method === "cash") return Math.min(total, Number(payCash || 0));
  if (method === "card") return Math.min(total, Number(payCard || 0));
  return Math.min(total, Number(payCash || 0) + Number(payCard || 0));
}

export function discountPercentOf(data: DbShape, code: string): number {
  const found = data.discountCodes.find(
    (dc) => dc.active && dc.code.trim().toLowerCase() === String(code || "").trim().toLowerCase(),
  );
  return found ? found.percent : 0;
}

export function invoiceTotalsOf(data: DbShape, inv: SalesInvoice): InvoiceTotals {
  return invoiceTotals({ ...inv, codePercent: discountPercentOf(data, inv.discountCode) });
}

export function productOptions(data: DbShape) {
  return data.products
    .filter((p) => p.active)
    .map((p) => ({
      value: p.id,
      label: `${p.name}`,
      hint: `${p.code} — ${p.barcode} — متاح: ${p.stock}`,
    }));
}

export function findProduct(data: DbShape, term: string): Product | undefined {
  const q = term.trim().toLowerCase();
  if (!q) return undefined;
  return data.products.find(
    (p) =>
      p.code.toLowerCase() === q ||
      p.barcode.toLowerCase() === q ||
      p.serial.toLowerCase() === q ||
      p.name.toLowerCase().includes(q),
  );
}

/** إجمالي مبيعات ومديونية العميل */
export function customerStats(data: DbShape, customerId: string) {
  const invoices = data.salesInvoices.filter((i) => i.customerId === customerId && i.status === "posted");
  let sales = 0;
  let paid = 0;
  for (const inv of invoices) {
    const t = invoiceTotalsOf(data, inv);
    sales += t.total;
    paid += t.paid;
  }
  const linked = data.invoices.filter((i) => i.type === "sales" && i.partyId === customerId);
  const settled = linked.reduce((sum, i) => sum + i.paid, 0);
  const linkedTotal = linked.reduce((sum, i) => sum + i.total, 0);
  return {
    count: invoices.length,
    sales,
    paid,
    debt: Math.max(0, linkedTotal - settled),
  };
}

export interface SalesByKeyRow {
  key: string;
  label: string;
  qty: number;
  total: number;
  count: number;
}

export function salesByProduct(data: DbShape): SalesByKeyRow[] {
  const map = new Map<string, SalesByKeyRow>();
  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted") continue;
    for (const line of inv.lines) {
      const row =
        map.get(line.productId) ??
        { key: line.productId, label: `${line.code} — ${line.name}`, qty: 0, total: 0, count: 0 };
      const t = lineTotals(line);
      row.qty += Number(line.qty || 0);
      row.total += t.total;
      row.count += 1;
      map.set(line.productId, row);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function salesByRep(data: DbShape): SalesByKeyRow[] {
  const map = new Map<string, SalesByKeyRow>();
  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted") continue;
    const key = inv.repId ?? "none";
    const label = data.reps.find((r) => r.id === inv.repId)?.name ?? "بدون مندوب";
    const row = map.get(key) ?? { key, label, qty: 0, total: 0, count: 0 };
    row.total += invoiceTotalsOf(data, inv).total;
    row.qty += inv.lines.reduce((sum, l) => sum + Number(l.qty || 0), 0);
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function salesByCustomer(data: DbShape): SalesByKeyRow[] {
  const map = new Map<string, SalesByKeyRow>();
  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted") continue;
    const key = inv.customerId ?? "cash";
    const label = inv.customerId
      ? data.customers.find((c) => c.id === inv.customerId)?.name ?? inv.customerName
      : "عملاء نقدي";
    const row = map.get(key) ?? { key, label, qty: 0, total: 0, count: 0 };
    row.total += invoiceTotalsOf(data, inv).total;
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function emptyLine(id: string): SalesLine {
  return {
    id,
    productId: "",
    code: "",
    name: "",
    qty: 1,
    unit: "ton",
    price: 0,
    discountPct: 0,
    discountAmt: 0,
    taxRate: Number(orgSettings().vatRate || 0),
  };
}
