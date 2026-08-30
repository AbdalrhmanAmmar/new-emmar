import { createFileRoute } from "@tanstack/react-router";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { dateTimeFmt, money } from "@/lib/format";
import { useDb, type Shift } from "@/lib/mockDb";

export const Route = createFileRoute("/treasury/reports/shift-diff")({
  head: () => ({
    meta: [
      { title: "فروقات التقفيل — تقارير الخزينة" },
      { name: "description", content: "تحليل فروقات تقفيل الورديات بين الرصيد الدفتري والنقدية الفعلية." },
      { property: "og:title", content: "تقرير فروقات التقفيل" },
      { property: "og:description", content: "الزيادة والعجز لكل وردية وأمين خزينة مع الأسباب." },
    ],
  }),
  component: ShiftDiffReport,
});

function ShiftDiffReport() {
  const data = useDb();
  const rows = data.shifts.filter((s) => s.status === "closed");

  const surplus = rows.filter((r) => (r.difference ?? 0) > 0).reduce((acc, r) => acc + (r.difference ?? 0), 0);
  const deficit = rows.filter((r) => (r.difference ?? 0) < 0).reduce((acc, r) => acc + Math.abs(r.difference ?? 0), 0);

  const columns: Array<Column<Shift>> = [
    { key: "no", header: "الوردية", cell: (row) => <strong>{row.no}</strong>, text: (row) => row.no },
    {
      key: "safe",
      header: "الخزينة",
      cell: (row) => data.safes.find((s) => s.id === row.safeId)?.name ?? "-",
      text: (row) => data.safes.find((s) => s.id === row.safeId)?.name ?? "",
    },
    {
      key: "user",
      header: "أمين الخزينة",
      cell: (row) => data.users.find((u) => u.id === row.userId)?.name ?? "-",
      text: (row) => data.users.find((u) => u.id === row.userId)?.name ?? "",
    },
    { key: "closed", header: "وقت التقفيل", cell: (row) => dateTimeFmt(row.closedAt), text: (row) => row.closedAt ?? "" },
    { key: "system", header: "الرصيد الدفتري", cell: (row) => money(row.systemBalance ?? 0), text: (row) => String(row.systemBalance ?? "") },
    { key: "counted", header: "النقدية الفعلية", cell: (row) => money(row.countedBalance ?? 0), text: (row) => String(row.countedBalance ?? "") },
    {
      key: "diff",
      header: "الفرق",
      cell: (row) => (
        <strong className={(row.difference ?? 0) === 0 ? "text-primary" : "text-destructive"}>
          {money(row.difference ?? 0)}
        </strong>
      ),
      text: (row) => String(row.difference ?? ""),
    },
    {
      key: "state",
      header: "النتيجة",
      align: "center",
      cell: (row) => {
        const diff = row.difference ?? 0;
        return (
          <StatusBadge
            label={diff === 0 ? "مطابق" : diff > 0 ? "زيادة" : "عجز"}
            tone={diff === 0 ? "green" : diff > 0 ? "gold" : "red"}
          />
        );
      },
      text: (row) => String(row.difference ?? ""),
    },
    { key: "reason", header: "سبب الفرق", cell: (row) => row.reason || "-", text: (row) => row.reason },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="تقرير فروقات التقفيل" description="مقارنة الرصيد الدفتري بالنقدية الفعلية لكل وردية مقفلة" />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي الزيادات" value={money(surplus)} tone="accent" />
        <StatCard label="إجمالي العجز" value={money(deficit)} tone="danger" />
        <StatCard label="عدد الورديات المقفلة" value={String(rows.length)} tone="muted" />
      </div>

      <DataTable title="فروقات التقفيل" data={rows} columns={columns} rowId={(row) => row.id} />
    </div>
  );
}
