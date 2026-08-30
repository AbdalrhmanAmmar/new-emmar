import { Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Printer, Send, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import { dateFmt, money } from "@/lib/format";
import { SALES_PAY_LABEL, UNIT_LABEL, useDb, type SalesInvoice } from "@/lib/mockDb";
import { printRecord } from "@/lib/printDoc";
import { invoiceTotalsOf, lineTotals } from "@/lib/sales";
import { deleteSalesInvoice, setSalesInvoiceStatus } from "@/lib/salesActions";

export function SalesInvoiceList() {
  const data = useDb();
  const navigate = useNavigate();

  const posted = data.salesInvoices.filter((i) => i.status === "posted");
  const totalSales = posted.reduce((sum, inv) => sum + invoiceTotalsOf(data, inv).total, 0);
  const collected = posted.reduce((sum, inv) => sum + invoiceTotalsOf(data, inv).paid, 0);
  const outstanding = totalSales - collected;

  const customerName = (inv: SalesInvoice) =>
    inv.customerId ? data.customers.find((c) => c.id === inv.customerId)?.name ?? "-" : inv.customerName || "عميل نقدي";

  const doPrint = (inv: SalesInvoice) => {
    const t = invoiceTotalsOf(data, inv);
    printRecord(
      `فاتورة مبيعات ${inv.no}`,
      [
        ["رقم الفاتورة", inv.no],
        ["التاريخ", dateFmt(inv.date)],
        ["العميل", customerName(inv)],
        ["تاريخ الاستحقاق", dateFmt(inv.dueDate)],
        ["الفرع", data.branches.find((b) => b.id === inv.branchId)?.name ?? "-"],
        ["المخزن", data.warehouses.find((w) => w.id === inv.warehouseId)?.name ?? "-"],
        ["المندوب", data.reps.find((r) => r.id === inv.repId)?.name ?? "-"],
        ["طريقة الدفع", SALES_PAY_LABEL[inv.payMethod]],
      ],
      {
        headers: ["الكود", "الصنف", "الكمية", "الوحدة", "سعر الوحدة", "الخصم", "الضريبة", "الإجمالي"],
        rows: inv.lines.map((l) => {
          const lt = lineTotals(l);
          return [
            l.code,
            l.name,
            String(l.qty),
            UNIT_LABEL[l.unit],
            String(l.price),
            lt.discount.toFixed(2),
            lt.tax.toFixed(2),
            lt.total.toFixed(2),
          ];
        }),
      },
      `الصافي: ${money(t.net)} — الضريبة: ${money(t.tax)} — المستحق: ${money(t.total)} — المدفوع: ${money(
        t.paid,
      )} — المتبقي: ${money(t.remaining)}`,
    );
  };

  const columns: Array<Column<SalesInvoice>> = [
    { key: "no", header: "رقم الفاتورة", cell: (r) => r.no, text: (r) => r.no },
    { key: "date", header: "التاريخ", cell: (r) => dateFmt(r.date), text: (r) => r.date },
    { key: "customer", header: "العميل", cell: (r) => customerName(r), text: (r) => customerName(r) },
    {
      key: "rep",
      header: "المندوب",
      cell: (r) => data.reps.find((x) => x.id === r.repId)?.name ?? "-",
      text: (r) => data.reps.find((x) => x.id === r.repId)?.name ?? "",
    },
    { key: "items", header: "الأصناف", cell: (r) => r.lines.length, align: "center" },
    {
      key: "total",
      header: "المستحق",
      cell: (r) => money(invoiceTotalsOf(data, r).total),
      text: (r) => String(invoiceTotalsOf(data, r).total),
    },
    { key: "paid", header: "المدفوع", cell: (r) => money(invoiceTotalsOf(data, r).paid) },
    {
      key: "remaining",
      header: "المتبقي",
      cell: (r) => {
        const rem = invoiceTotalsOf(data, r).remaining;
        return <span className={rem > 0 ? "font-semibold text-destructive" : ""}>{money(rem)}</span>;
      },
    },
    { key: "pay", header: "طريقة الدفع", cell: (r) => SALES_PAY_LABEL[r.payMethod], text: (r) => SALES_PAY_LABEL[r.payMethod] },
    {
      key: "status",
      header: "الحالة",
      align: "center",
      cell: (r) => (
        <StatusBadge
          label={r.status === "posted" ? "مُرحّلة" : "مسودة"}
          tone={r.status === "posted" ? "green" : "gold"}
        />
      ),
      text: (r) => (r.status === "posted" ? "مرحلة" : "مسودة"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="فواتير المبيعات"
        description="إنشاء وتعديل وطباعة فواتير البيع النقدي والآجل بالجنيه المصري"
        actions={
          <Button asChild className="gap-1.5">
            <Link to="/sales/invoices/new">
              <Plus className="size-4" />
              فاتورة مبيعات جديدة
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد الفواتير المُرحّلة" value={String(posted.length)} />
        <StatCard label="إجمالي المبيعات" value={money(totalSales)} />
        <StatCard label="المحصّل" value={money(collected)} tone="accent" />
        <StatCard label="المتبقي على العملاء" value={money(outstanding)} tone="danger" />
      </div>

      <DataTable
        title="فواتير المبيعات"
        data={[...data.salesInvoices].sort((a, b) => (a.date < b.date ? 1 : -1))}
        columns={columns}
        rowId={(r) => r.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/sales/invoices/$id", params: { id: row.id } }),
              },
              { label: "طباعة", icon: <Printer className="size-4" />, onSelect: () => doPrint(row) },
              row.status === "draft"
                ? {
                    label: "ترحيل",
                    icon: <Send className="size-4" />,
                    onSelect: () => {
                      const res = setSalesInvoiceStatus(row.id, "posted");
                      res.ok ? toast.success("تم ترحيل الفاتورة") : toast.error(res.error ?? "خطأ");
                    },
                  }
                : {
                    label: "إلغاء الترحيل",
                    icon: <Undo2 className="size-4" />,
                    onSelect: () => {
                      const res = setSalesInvoiceStatus(row.id, "draft");
                      res.ok ? toast.success("تم إلغاء الترحيل وإرجاع المخزون") : toast.error(res.error ?? "خطأ");
                    },
                  },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const res = deleteSalesInvoice(row.id);
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
