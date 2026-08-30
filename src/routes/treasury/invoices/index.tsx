import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgeDollarSign, Banknote } from "lucide-react";
import { useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import { dateFmt, money } from "@/lib/format";
import { useDb, type Invoice } from "@/lib/mockDb";
import { INVOICE_STATUS_LABEL, invoiceRemaining, invoiceStatus } from "@/lib/treasury";

export const Route = createFileRoute("/treasury/invoices/")({
  head: () => ({
    meta: [
      { title: "الفواتير الآجلة — الخزينة" },
      { name: "description", content: "متابعة الفواتير الآجلة للعملاء والموردين والمبالغ المتبقية وتسويتها." },
      { property: "og:title", content: "الفواتير الآجلة والتسوية" },
      { property: "og:description", content: "المسدد والمتبقي لكل فاتورة مع بدء سند قبض أو صرف مباشرة." },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const data = useDb();
  const navigate = useNavigate();
  const [kind, setKind] = useState<"sales" | "purchase">("sales");

  const rows = data.invoices
    .filter((i) => i.type === kind)
    .slice()
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  const parties = kind === "sales" ? data.customers : data.suppliers;
  const partyName = (id: string) => parties.find((p) => p.id === id)?.name ?? "-";

  const columns: Array<Column<Invoice>> = [
    { key: "no", header: "رقم الفاتورة", cell: (row) => <strong>{row.no}</strong>, text: (row) => row.no },
    { key: "party", header: kind === "sales" ? "العميل" : "المورد", cell: (row) => partyName(row.partyId), text: (row) => partyName(row.partyId) },
    { key: "date", header: "التاريخ", cell: (row) => dateFmt(row.date), text: (row) => dateFmt(row.date) },
    { key: "due", header: "الاستحقاق", cell: (row) => dateFmt(row.dueDate), text: (row) => dateFmt(row.dueDate) },
    { key: "total", header: "الإجمالي", cell: (row) => money(row.total), text: (row) => String(row.total) },
    { key: "paid", header: "المسدد", cell: (row) => <span className="text-primary">{money(row.paid)}</span>, text: (row) => String(row.paid) },
    {
      key: "remaining",
      header: "المتبقي",
      cell: (row) => <strong className="text-destructive">{money(invoiceRemaining(row))}</strong>,
      text: (row) => String(invoiceRemaining(row)),
    },
    {
      key: "status",
      header: "الحالة",
      align: "center",
      cell: (row) => {
        const status = invoiceStatus(row);
        return (
          <StatusBadge
            label={INVOICE_STATUS_LABEL[status]}
            tone={status === "paid" ? "green" : status === "partial" ? "gold" : "red"}
          />
        );
      },
      text: (row) => INVOICE_STATUS_LABEL[invoiceStatus(row)],
    },
  ];

  const totals = rows.reduce(
    (acc, row) => {
      acc.total += row.total;
      acc.paid += row.paid;
      acc.remaining += invoiceRemaining(row);
      return acc;
    },
    { total: 0, paid: 0, remaining: 0 },
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="الفواتير الآجلة والتسوية"
        description="متابعة المستحقات وتسويتها من خلال سندات القبض والصرف"
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <Button size="sm" variant={kind === "sales" ? "default" : "ghost"} onClick={() => setKind("sales")}>
              فواتير العملاء
            </Button>
            <Button size="sm" variant={kind === "purchase" ? "default" : "ghost"} onClick={() => setKind("purchase")}>
              فواتير الموردين
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي الفواتير" value={money(totals.total)} />
        <StatCard label="المسدد" value={money(totals.paid)} tone="accent" />
        <StatCard label="المتبقي" value={money(totals.remaining)} tone="danger" />
      </div>

      <DataTable
        title={kind === "sales" ? "فواتير مبيعات آجلة" : "فواتير مشتريات آجلة"}
        data={rows}
        columns={columns}
        rowId={(row) => row.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: kind === "sales" ? "تحصيل بسند قبض" : "سداد بسند صرف",
                icon: kind === "sales" ? <BadgeDollarSign className="size-4" /> : <Banknote className="size-4" />,
                disabled: invoiceRemaining(row) <= 0.01,
                onSelect: () =>
                  navigate({ to: kind === "sales" ? "/treasury/receipts/new" : "/treasury/payments/new" }),
              },
            ]}
          />
        )}
      />
    </div>
  );
}
