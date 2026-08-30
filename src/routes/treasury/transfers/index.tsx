import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import { dateFmt, money } from "@/lib/format";
import { useDb, type Transfer } from "@/lib/mockDb";
import { printRecord } from "@/lib/printDoc";
import { deleteTransfer } from "@/lib/treasuryActions";

export const Route = createFileRoute("/treasury/transfers/")({
  head: () => ({
    meta: [
      { title: "التحويل بين الخزن — الخزينة" },
      { name: "description", content: "سجل التحويلات الداخلية بين الخزن والحسابات البنكية ومصاريفها." },
      { property: "og:title", content: "التحويل بين الخزن" },
      { property: "og:description", content: "متابعة حركة السيولة الداخلية ومصاريف التحويل." },
    ],
  }),
  component: TransfersPage,
});

function TransfersPage() {
  const data = useDb();
  const safeName = (id: string) => data.safes.find((s) => s.id === id)?.name ?? "-";
  const rows = data.transfers.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

  const columns: Array<Column<Transfer>> = [
    { key: "no", header: "رقم التحويل", cell: (row) => <strong>{row.no}</strong>, text: (row) => row.no },
    { key: "date", header: "التاريخ", cell: (row) => dateFmt(row.date), text: (row) => dateFmt(row.date) },
    { key: "from", header: "من خزينة", cell: (row) => safeName(row.fromSafeId), text: (row) => safeName(row.fromSafeId) },
    { key: "to", header: "إلى خزينة", cell: (row) => safeName(row.toSafeId), text: (row) => safeName(row.toSafeId) },
    { key: "amount", header: "المبلغ", cell: (row) => <strong className="text-primary">{money(row.amount)}</strong>, text: (row) => String(row.amount) },
    { key: "fee", header: "مصاريف التحويل", cell: (row) => money(row.fee), text: (row) => String(row.fee) },
    {
      key: "user",
      header: "المستخدم",
      cell: (row) => data.users.find((u) => u.id === row.userId)?.name ?? "-",
      text: (row) => data.users.find((u) => u.id === row.userId)?.name ?? "",
    },
    { key: "note", header: "البيان", cell: (row) => row.note || "-", text: (row) => row.note },
  ];

  const total = rows.reduce((acc, row) => acc + row.amount, 0);
  const fees = rows.reduce((acc, row) => acc + row.fee, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="التحويل بين الخزن"
        description="نقل السيولة بين الخزن والحسابات البنكية والمحافظ"
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/treasury/transfers/new">
              <Plus className="size-4" />
              تحويل جديد
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي التحويلات" value={money(total)} />
        <StatCard label="إجمالي المصاريف" value={money(fees)} tone="danger" />
        <StatCard label="عدد التحويلات" value={String(rows.length)} tone="muted" />
      </div>

      <DataTable
        title="سجل التحويلات"
        data={rows}
        columns={columns}
        rowId={(row) => row.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "طباعة",
                icon: <Printer className="size-4" />,
                onSelect: () =>
                  printRecord(
                    `إشعار تحويل ${row.no}`,
                    [
                      ["رقم التحويل", row.no],
                      ["التاريخ", dateFmt(row.date)],
                      ["من خزينة", safeName(row.fromSafeId)],
                      ["إلى خزينة", safeName(row.toSafeId)],
                      ["المبلغ", money(row.amount)],
                      ["مصاريف التحويل", money(row.fee)],
                      ["المستخدم", data.users.find((u) => u.id === row.userId)?.name ?? "-"],
                      ["البيان", row.note || "-"],
                    ],
                    undefined,
                    `إجمالي المخصوم من الخزينة المُحوّل منها: ${money(row.amount + row.fee)}`,
                  ),
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  deleteTransfer(row.id);
                  toast.success("تم حذف التحويل");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}
