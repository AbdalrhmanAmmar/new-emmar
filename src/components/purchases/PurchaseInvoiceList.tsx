import { Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Printer, Send, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import { dateFmt, money } from "@/lib/format";
import { SALES_PAY_LABEL, useDb, type PurchaseInvoice } from "@/lib/mockDb";
import { printPurchaseInvoice } from "@/lib/printPurchase";
import { deletePurchaseInvoice, setPurchaseInvoiceStatus } from "@/lib/purchaseActions";
import { purchaseTotalsOf } from "@/lib/purchases";

export function PurchaseInvoiceList() {
  const data = useDb();
  const navigate = useNavigate();

  const posted = data.purchaseInvoices.filter((i) => i.status === "posted");
  const totalPurchases = posted.reduce((sum, inv) => sum + purchaseTotalsOf(data, inv).total, 0);
  const paid = posted.reduce((sum, inv) => sum + purchaseTotalsOf(data, inv).paid, 0);

  const supplierName = (inv: PurchaseInvoice) =>
    inv.supplierId ? data.suppliers.find((s) => s.id === inv.supplierId)?.name ?? "-" : inv.supplierName || "مورد نقدي";

  const columns: Array<Column<PurchaseInvoice>> = [
    { key: "no", header: "رقم الفاتورة", cell: (r) => r.no, text: (r) => r.no },
    { key: "supplierNo", header: "فاتورة المورد", cell: (r) => r.supplierInvoiceNo || "-", text: (r) => r.supplierInvoiceNo },
    { key: "date", header: "التاريخ", cell: (r) => dateFmt(r.date), text: (r) => r.date },
    { key: "supplier", header: "المورد", cell: (r) => supplierName(r), text: (r) => supplierName(r) },
    {
      key: "warehouse",
      header: "المخزن",
      cell: (r) => data.warehouses.find((w) => w.id === r.warehouseId)?.name ?? "-",
      text: (r) => data.warehouses.find((w) => w.id === r.warehouseId)?.name ?? "",
    },
    { key: "items", header: "الأصناف", cell: (r) => r.lines.length, align: "center" },
    {
      key: "total",
      header: "المستحق",
      cell: (r) => money(purchaseTotalsOf(data, r).total),
      text: (r) => String(purchaseTotalsOf(data, r).total),
    },
    { key: "paid", header: "المسدد", cell: (r) => money(purchaseTotalsOf(data, r).paid) },
    {
      key: "remaining",
      header: "المتبقي",
      cell: (r) => {
        const rem = purchaseTotalsOf(data, r).remaining;
        return <span className={rem > 0 ? "font-semibold text-destructive" : ""}>{money(rem)}</span>;
      },
    },
    { key: "pay", header: "طريقة السداد", cell: (r) => SALES_PAY_LABEL[r.payMethod], text: (r) => SALES_PAY_LABEL[r.payMethod] },
    {
      key: "status",
      header: "الحالة",
      align: "center",
      cell: (r) => (
        <StatusBadge label={r.status === "posted" ? "مُرحّلة" : "مسودة"} tone={r.status === "posted" ? "green" : "gold"} />
      ),
      text: (r) => (r.status === "posted" ? "مرحلة" : "مسودة"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="فواتير المشتريات"
        description="تسجيل وتعديل وطباعة فواتير الشراء النقدية والآجلة بالجنيه المصري"
        actions={
          <Button asChild className="gap-1.5">
            <Link to="/purchases/invoices/new">
              <Plus className="size-4" />
              فاتورة مشتريات جديدة
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد الفواتير المُرحّلة" value={String(posted.length)} />
        <StatCard label="إجمالي المشتريات" value={money(totalPurchases)} />
        <StatCard label="المسدد للموردين" value={money(paid)} tone="accent" />
        <StatCard label="المستحق للموردين" value={money(Math.max(0, totalPurchases - paid))} tone="danger" />
      </div>

      <DataTable
        title="فواتير المشتريات"
        data={[...data.purchaseInvoices].sort((a, b) => (a.date < b.date ? 1 : -1))}
        columns={columns}
        rowId={(r) => r.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/purchases/invoices/$id", params: { id: row.id } }),
              },
              { label: "طباعة", icon: <Printer className="size-4" />, onSelect: () => printPurchaseInvoice(data, row) },
              row.status === "draft"
                ? {
                    label: "ترحيل",
                    icon: <Send className="size-4" />,
                    onSelect: () => {
                      const res = setPurchaseInvoiceStatus(row.id, "posted");
                      res.ok ? toast.success("تم ترحيل الفاتورة وإضافة الكميات للمخزن") : toast.error(res.error ?? "خطأ");
                    },
                  }
                : {
                    label: "إلغاء الترحيل",
                    icon: <Undo2 className="size-4" />,
                    onSelect: () => {
                      const res = setPurchaseInvoiceStatus(row.id, "draft");
                      res.ok ? toast.success("تم إلغاء الترحيل وخصم الكميات") : toast.error(res.error ?? "خطأ");
                    },
                  },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const res = deletePurchaseInvoice(row.id);
                  res.ok ? toast.success("تم حذف الفاتورة") : toast.error(res.error ?? "خطأ");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}
