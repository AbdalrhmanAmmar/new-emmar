import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Ban, CheckCircle2, Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { SAFE_TYPE_LABEL, useDb, type Safe } from "@/lib/mockDb";
import { safeBalance, totalsByType } from "@/lib/treasury";
import { deleteSafe, toggleSafeActive } from "@/lib/treasuryActions";

export const Route = createFileRoute("/treasury/safes/")({
  head: () => ({
    meta: [
      { title: "الخزن والحسابات — الخزينة" },
      { name: "description", content: "إضافة وتصنيف الخزن والحسابات البنكية والمحافظ ومتابعة أرصدتها." },
      { property: "og:title", content: "الخزن والحسابات البنكية" },
      { property: "og:description", content: "الرصيد الافتتاحي والرصيد الحالي لكل خزينة أو حساب." },
    ],
  }),
  component: SafesPage,
});

function SafesPage() {
  const data = useDb();
  const navigate = useNavigate();
  const totals = totalsByType(data);

  const columns: Array<Column<Safe>> = [
    { key: "code", header: "الكود", cell: (row) => row.code, text: (row) => row.code },
    { key: "name", header: "الاسم", cell: (row) => <strong>{row.name}</strong>, text: (row) => row.name },
    {
      key: "type",
      header: "النوع",
      cell: (row) => SAFE_TYPE_LABEL[row.type],
      text: (row) => SAFE_TYPE_LABEL[row.type],
    },
    {
      key: "branch",
      header: "الفرع",
      cell: (row) => data.branches.find((b) => b.id === row.branchId)?.name ?? "-",
      text: (row) => data.branches.find((b) => b.id === row.branchId)?.name ?? "",
    },
    {
      key: "owner",
      header: "أمين الخزينة",
      cell: (row) => data.users.find((u) => u.id === row.ownerId)?.name ?? "-",
      text: (row) => data.users.find((u) => u.id === row.ownerId)?.name ?? "",
    },
    {
      key: "opening",
      header: "الرصيد الافتتاحي",
      cell: (row) => money(row.openingBalance),
      text: (row) => String(row.openingBalance),
    },
    {
      key: "balance",
      header: "الرصيد الحالي",
      cell: (row) => <strong className="text-primary">{money(safeBalance(data, row.id))}</strong>,
      text: (row) => String(safeBalance(data, row.id)),
    },
    {
      key: "status",
      header: "الحالة",
      align: "center",
      cell: (row) => <StatusBadge label={row.active ? "نشطة" : "معطّلة"} tone={row.active ? "green" : "gray"} />,
      text: (row) => (row.active ? "نشطة" : "معطلة"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="الخزن والحسابات"
        description="الخزينة الرئيسية، خزن الفروع، الحسابات البنكية والمحافظ الإلكترونية"
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/treasury/safes/new">
              <Plus className="size-4" />
              إضافة خزينة
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="نقدية الخزن" value={money(totals.cash)} />
        <StatCard label="أرصدة البنوك" value={money(totals.bank)} tone="accent" />
        <StatCard label="المحافظ الإلكترونية" value={money(totals.wallet)} tone="muted" />
        <StatCard
          label="إجمالي السيولة"
          value={money(totals.cash + totals.bank + totals.wallet)}
          hint={`${data.safes.filter((s) => s.active).length} خزينة نشطة`}
        />
      </div>

      <DataTable
        title="قائمة الخزن والحسابات"
        data={data.safes}
        columns={columns}
        rowId={(row) => row.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/treasury/safes/$id", params: { id: row.id } }),
              },
              {
                label: "كشف الحركة",
                icon: <ScrollText className="size-4" />,
                onSelect: () => navigate({ to: "/treasury/statement", search: { safe: row.id } }),
              },
              {
                label: row.active ? "تعطيل" : "تنشيط",
                icon: row.active ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />,
                onSelect: () => {
                  toggleSafeActive(row.id);
                  toast.success("تم تحديث حالة الخزينة");
                },
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const result = deleteSafe(row.id);
                  if (result.ok) toast.success("تم حذف الخزينة");
                  else toast.error(result.error ?? "تعذّر الحذف");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}
