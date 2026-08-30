import type { DbShape, PurchaseInvoice } from "@/lib/mockDb";
import { invoiceTotals, lineTotals, type InvoiceTotals, type SalesByKeyRow } from "@/lib/sales";

/** إجماليات فاتورة مشتريات (بدون أكواد خصم — الخصم على مستوى السطر) */
export function purchaseTotals(inv: {
  lines: PurchaseInvoice["lines"];
  payMethod: PurchaseInvoice["payMethod"];
  payCash: number;
  payCard: number;
}): InvoiceTotals {
  return invoiceTotals({ ...inv, codePercent: 0 });
}

export function purchaseTotalsOf(_data: DbShape, inv: PurchaseInvoice): InvoiceTotals {
  return purchaseTotals(inv);
}

/** إحصائيات المورد: المشتريات والمسدد والمستحق عليه */
export function supplierStats(data: DbShape, supplierId: string) {
  const invoices = data.purchaseInvoices.filter((i) => i.supplierId === supplierId && i.status === "posted");
  let purchases = 0;
  let paid = 0;
  for (const inv of invoices) {
    const t = purchaseTotals(inv);
    purchases += t.total;
    paid += t.paid;
  }
  const linked = data.invoices.filter((i) => i.type === "purchase" && i.partyId === supplierId);
  const linkedTotal = linked.reduce((sum, i) => sum + i.total, 0);
  const settled = linked.reduce((sum, i) => sum + i.paid, 0);
  return {
    count: invoices.length,
    purchases,
    paid,
    debt: Math.max(0, linkedTotal - settled),
  };
}

export function purchasesByProduct(data: DbShape): SalesByKeyRow[] {
  const map = new Map<string, SalesByKeyRow>();
  for (const inv of data.purchaseInvoices) {
    if (inv.status !== "posted") continue;
    for (const line of inv.lines) {
      const row =
        map.get(line.productId) ??
        { key: line.productId, label: `${line.code} — ${line.name}`, qty: 0, total: 0, count: 0 };
      row.qty += Number(line.qty || 0);
      row.total += lineTotals(line).total;
      row.count += 1;
      map.set(line.productId, row);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function purchasesBySupplier(data: DbShape): SalesByKeyRow[] {
  const map = new Map<string, SalesByKeyRow>();
  for (const inv of data.purchaseInvoices) {
    if (inv.status !== "posted") continue;
    const key = inv.supplierId ?? "cash";
    const label = inv.supplierId
      ? data.suppliers.find((s) => s.id === inv.supplierId)?.name ?? inv.supplierName
      : "مورد نقدي";
    const row = map.get(key) ?? { key, label, qty: 0, total: 0, count: 0 };
    row.total += purchaseTotals(inv).total;
    row.qty += inv.lines.reduce((sum, l) => sum + Number(l.qty || 0), 0);
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** مؤشرات لوحة المشتريات */
export function purchaseKpis(data: DbShape) {
  const posted = data.purchaseInvoices.filter((i) => i.status === "posted");
  let purchases = 0;
  let paid = 0;
  for (const inv of posted) {
    const t = purchaseTotals(inv);
    purchases += t.total;
    paid += t.paid;
  }
  const debt = data.suppliers.reduce((sum, s) => sum + supplierStats(data, s.id).debt, 0);
  return { count: posted.length, purchases, paid, remaining: Math.max(0, purchases - paid), debt };
}

/** اتجاه المشتريات لعدد من الأيام */
export function purchaseTrendSeries(data: DbShape, days = 14) {
  const out: Array<{ label: string; value: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const value = data.purchaseInvoices
      .filter((inv) => inv.status === "posted" && inv.date === key)
      .reduce((sum, inv) => sum + purchaseTotals(inv).total, 0);
    out.push({ label: `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`, value: Math.round(value) });
  }
  return out;
}

/** فواتير مورد معيّن مع الإجماليات */
export function supplierInvoices(data: DbShape, supplierId: string) {
  return [...data.purchaseInvoices]
    .filter((i) => i.supplierId === supplierId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((invoice) => {
      const t = purchaseTotals(invoice);
      return { invoice, total: t.total, paid: t.paid, remaining: t.remaining };
    });
}

export interface SupplierPriceRow {
  productId: string;
  code: string;
  name: string;
  unit: PurchaseInvoice["lines"][number]["unit"];
  unitName?: string;
  lastPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  qty: number;
  lastInvoiceNo: string;
  lastDate: string;
}

/** تاريخ أسعار الشراء من مورد معيّن */
export function supplierPriceHistory(data: DbShape, supplierId: string): SupplierPriceRow[] {
  const map = new Map<string, SupplierPriceRow & { sum: number; n: number }>();
  const invoices = [...data.purchaseInvoices]
    .filter((i) => i.supplierId === supplierId && i.status === "posted")
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const inv of invoices) {
    for (const line of inv.lines) {
      const price = Number(line.price || 0);
      const prev = map.get(line.productId);
      if (!prev) {
        map.set(line.productId, {
          productId: line.productId,
          code: line.code,
          name: line.name,
          unit: line.unit,
          unitName: line.unitName,
          lastPrice: price,
          minPrice: price,
          maxPrice: price,
          avgPrice: price,
          qty: Number(line.qty || 0),
          lastInvoiceNo: inv.no,
          lastDate: inv.date,
          sum: price,
          n: 1,
        });
        continue;
      }
      prev.lastPrice = price;
      prev.minPrice = Math.min(prev.minPrice, price);
      prev.maxPrice = Math.max(prev.maxPrice, price);
      prev.qty += Number(line.qty || 0);
      prev.sum += price;
      prev.n += 1;
      prev.avgPrice = prev.sum / prev.n;
      prev.lastInvoiceNo = inv.no;
      prev.lastDate = inv.date;
    }
  }
  return [...map.values()].map(({ sum: _s, n: _n, ...row }) => row);
}
