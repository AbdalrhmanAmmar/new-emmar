import { purchaseTotalsOf } from "@/lib/purchases";
import { returnTotals } from "@/lib/returns";
import type { DbShape } from "@/lib/mockDb";

export interface SupplierLedgerRow {
  date: string;
  kind: "invoice" | "payment" | "return";
  ref: string;
  desc: string;
  /** مدفوع للمورد */
  debit: number;
  /** مستحق للمورد (فواتير شراء) */
  credit: number;
  balance: number;
}

export interface SupplierLedger {
  rows: SupplierLedgerRow[];
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

/** كشف حساب مورد: كل فواتير الشراء (دائن) وكل المدفوعات (مدين) والرصيد الجارى المستحق للمورد */
export function supplierLedger(
  data: DbShape,
  supplierId: string,
  from?: string,
  to?: string,
): SupplierLedger {
  const rows: SupplierLedgerRow[] = [];

  for (const inv of data.purchaseInvoices) {
    if (inv.supplierId !== supplierId || inv.status !== "posted") continue;
    if (!inRange(inv.date, from, to)) continue;
    const t = purchaseTotalsOf(data, inv);
    rows.push({
      date: inv.date,
      kind: "invoice",
      ref: inv.no,
      desc: `فاتورة شراء — ${inv.lines.length} صنف`,
      debit: 0,
      credit: t.total,
      balance: 0,
    });
  }

  for (const doc of data.returns) {
    if (doc.kind !== "purchase" || doc.partyId !== supplierId || doc.status !== "posted") continue;
    if (doc.settle !== "credit") continue;
    if (!inRange(doc.date, from, to)) continue;
    rows.push({
      date: doc.date,
      kind: "return",
      ref: doc.no,
      desc: `مرتجع مشتريات — إشعار مدين${doc.refInvoiceNo ? ` عن فاتورة ${doc.refInvoiceNo}` : ""}`,
      debit: returnTotals(doc.lines).total,
      credit: 0,
      balance: 0,
    });
  }

  for (const v of data.vouchers) {
    if (v.kind !== "payment" || v.partyId !== supplierId || v.status !== "posted") continue;
    if (!inRange(v.date, from, to)) continue;
    rows.push({
      date: v.date,
      kind: "payment",
      ref: v.no,
      desc: v.note || (v.reference ? `دفعة عن ${v.reference}` : "سند صرف"),
      debit: v.amount,
      credit: 0,
      balance: 0,
    });
  }

  rows.sort((a, b) => (a.date === b.date ? a.kind.localeCompare(b.kind) : a.date.localeCompare(b.date)));

  let running = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  for (const row of rows) {
    running += row.credit - row.debit;
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
