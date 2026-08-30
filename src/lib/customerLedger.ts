import { invoiceTotalsOf, lineTotals } from "@/lib/sales";
import type { DbShape, SalesInvoice, Unit } from "@/lib/mockDb";

export interface LedgerRow {
  date: string;
  kind: "invoice" | "receipt";
  ref: string;
  desc: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface CustomerLedger {
  rows: LedgerRow[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
  invoiceCount: number;
  lastInvoiceDate: string | null;
}

function inRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/** كشف حساب العميل: كل الفواتير (مدين) وكل التحصيلات (دائن) والرصيد الجارى */
export function customerLedger(
  data: DbShape,
  customerId: string,
  from?: string,
  to?: string,
): CustomerLedger {
  const rows: LedgerRow[] = [];

  for (const inv of data.salesInvoices) {
    if (inv.customerId !== customerId || inv.status !== "posted") continue;
    if (!inRange(inv.date, from, to)) continue;
    const t = invoiceTotalsOf(data, inv);
    rows.push({
      date: inv.date,
      kind: "invoice",
      ref: inv.no,
      desc: `فاتورة مبيعات — ${inv.lines.length} صنف`,
      debit: t.total,
      credit: 0,
      balance: 0,
    });
  }

  for (const v of data.vouchers) {
    if (v.kind !== "receipt" || v.partyId !== customerId || v.status !== "posted") continue;
    if (!inRange(v.date, from, to)) continue;
    rows.push({
      date: v.date,
      kind: "receipt",
      ref: v.no,
      desc: v.note || (v.reference ? `تحصيل عن ${v.reference}` : "سند قبض"),
      debit: 0,
      credit: v.amount,
      balance: 0,
    });
  }

  rows.sort((a, b) => (a.date === b.date ? a.kind.localeCompare(b.kind) : a.date.localeCompare(b.date)));

  let running = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  for (const row of rows) {
    running += row.debit - row.credit;
    row.balance = running;
    totalDebit += row.debit;
    totalCredit += row.credit;
  }

  const invoices = rows.filter((r) => r.kind === "invoice");
  return {
    rows,
    totalDebit,
    totalCredit,
    balance: running,
    invoiceCount: invoices.length,
    lastInvoiceDate: invoices.length ? invoices[invoices.length - 1]!.date : null,
  };
}

export interface CustomerInvoiceRow {
  invoice: SalesInvoice;
  total: number;
  paid: number;
  remaining: number;
}

/** فواتير العميل مرتبة من الأحدث للأقدم */
export function customerInvoices(data: DbShape, customerId: string): CustomerInvoiceRow[] {
  return data.salesInvoices
    .filter((i) => i.customerId === customerId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((invoice) => {
      const t = invoiceTotalsOf(data, invoice);
      return { invoice, total: t.total, paid: t.paid, remaining: t.remaining };
    });
}

export interface CustomerPriceRow {
  productId: string;
  code: string;
  name: string;
  unit: Unit;
  lastPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  qty: number;
  total: number;
  lastDate: string;
  lastInvoiceNo: string;
}

/** الأسعار التى تحاسب بها العميل لكل صنف (آخر سعر / أقل / أعلى / متوسط مرجّح) */
export function customerPriceHistory(data: DbShape, customerId: string): CustomerPriceRow[] {
  const map = new Map<string, CustomerPriceRow & { weighted: number }>();

  const invoices = data.salesInvoices
    .filter((i) => i.customerId === customerId && i.status === "posted")
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const inv of invoices) {
    for (const line of inv.lines) {
      const price = Number(line.price || 0);
      const qty = Number(line.qty || 0);
      const t = lineTotals(line);
      const row = map.get(line.productId);
      if (!row) {
        map.set(line.productId, {
          productId: line.productId,
          code: line.code,
          name: line.name,
          unit: line.unit,
          lastPrice: price,
          minPrice: price,
          maxPrice: price,
          avgPrice: price,
          qty,
          total: t.total,
          lastDate: inv.date,
          lastInvoiceNo: inv.no,
          weighted: price * qty,
        });
        continue;
      }
      row.lastPrice = price;
      row.minPrice = Math.min(row.minPrice, price);
      row.maxPrice = Math.max(row.maxPrice, price);
      row.qty += qty;
      row.total += t.total;
      row.weighted += price * qty;
      row.avgPrice = row.qty > 0 ? row.weighted / row.qty : price;
      row.lastDate = inv.date;
      row.lastInvoiceNo = inv.no;
    }
  }

  return [...map.values()]
    .map(({ weighted: _weighted, ...rest }) => rest)
    .sort((a, b) => b.total - a.total);
}
