import { lineTotals } from "@/lib/sales";
import { baseQty } from "@/lib/units";
import type { DbShape, ReturnDoc, ReturnKind, SalesLine } from "@/lib/mockDb";

export interface ReturnTotals {
  gross: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
  qty: number;
}

/** إجماليات المرتجع (نفس منطق الفاتورة: خصم السطر ثم الضريبة) */
export function returnTotals(lines: SalesLine[]): ReturnTotals {
  let gross = 0;
  let discount = 0;
  let net = 0;
  let tax = 0;
  let qty = 0;
  for (const line of lines) {
    const t = lineTotals(line);
    gross += t.gross;
    discount += t.discount;
    net += t.net;
    tax += t.tax;
    qty += baseQty(line);
  }
  return { gross, discount, net, tax, total: net + tax, qty };
}

export function returnTotal(doc: ReturnDoc): number {
  return returnTotals(doc.lines).total;
}

/** الكمية الأساسية المرتجعة سابقاً من صنف داخل فاتورة معينة (بدون مستند حالى) */
export function returnedQty(
  data: DbShape,
  invoiceId: string,
  productId: string,
  excludeReturnId?: string,
): number {
  let sum = 0;
  for (const doc of data.returns) {
    if (doc.refInvoiceId !== invoiceId || doc.status === "void") continue;
    if (excludeReturnId && doc.id === excludeReturnId) continue;
    for (const line of doc.lines) {
      if (line.productId === productId) sum += baseQty(line);
    }
  }
  return sum;
}

/** الكمية المتاحة للإرجاع من صنف داخل فاتورة (بالوحدة الأساسية) */
export function returnableQty(
  data: DbShape,
  kind: ReturnKind,
  invoiceId: string,
  productId: string,
  excludeReturnId?: string,
): number {
  const invoice =
    kind === "sales"
      ? data.salesInvoices.find((i) => i.id === invoiceId)
      : data.purchaseInvoices.find((i) => i.id === invoiceId);
  if (!invoice) return Infinity;
  const invoiced = invoice.lines
    .filter((l) => l.productId === productId)
    .reduce((s, l) => s + baseQty(l), 0);
  return Math.max(0, invoiced - returnedQty(data, invoiceId, productId, excludeReturnId));
}

/** فواتير الجهة القابلة للإرجاع */
export function returnableInvoices(data: DbShape, kind: ReturnKind, partyId?: string | null) {
  if (kind === "sales") {
    return data.salesInvoices
      .filter((i) => i.status === "posted" && (!partyId || i.customerId === partyId))
      .map((i) => ({ id: i.id, no: i.no, date: i.date, lines: i.lines, partyName: i.customerName }));
  }
  return data.purchaseInvoices
    .filter((i) => i.status === "posted" && (!partyId || i.supplierId === partyId))
    .map((i) => ({ id: i.id, no: i.no, date: i.date, lines: i.lines, partyName: i.supplierName }));
}

export interface ReturnsKpis {
  count: number;
  qty: number;
  value: number;
  cashRefunds: number;
}

export function returnsKpis(data: DbShape, kind?: ReturnKind): ReturnsKpis {
  const rows = data.returns.filter((r) => r.status === "posted" && (kind ? r.kind === kind : true));
  let qty = 0;
  let value = 0;
  let cashRefunds = 0;
  for (const doc of rows) {
    const t = returnTotals(doc.lines);
    qty += t.qty;
    value += t.total;
    if (doc.settle === "cash") cashRefunds += t.total;
  }
  return { count: rows.length, qty, value, cashRefunds };
}
