import { printSalesInvoice, type InvoicePrintInput } from "@/lib/printInvoice";
import type { DbShape, PurchaseInvoice } from "@/lib/mockDb";
import { purchaseTotals } from "@/lib/purchases";

export function purchasePrintInput(data: DbShape, inv: PurchaseInvoice): InvoicePrintInput {
  const totals = purchaseTotals(inv);
  const supplier = inv.supplierId ? data.suppliers.find((s) => s.id === inv.supplierId) : undefined;
  return {
    no: inv.no,
    date: inv.date,
    dueDate: inv.dueDate,
    customer: supplier?.name ?? inv.supplierName || "مورد نقدي",
    customerPhone: supplier?.phone,
    branch: data.branches.find((b) => b.id === inv.branchId)?.name ?? "-",
    warehouse: data.warehouses.find((w) => w.id === inv.warehouseId)?.name ?? "-",
    rep: data.users.find((u) => u.id === inv.userId)?.name ?? "-",
    payMethod: inv.payMethod,
    discountCode: inv.supplierInvoiceNo,
    note: inv.note,
    status: inv.status === "posted" ? "مُرحّلة" : "مسودة",
    lines: inv.lines,
    totals,
    org: data.settings,
    docTitle: "فاتورة مشتريات",
    partyLabel: "المورد",
  };
}

export function printPurchaseInvoice(data: DbShape, inv: PurchaseInvoice) {
  printSalesInvoice(purchasePrintInput(data, inv));
}
