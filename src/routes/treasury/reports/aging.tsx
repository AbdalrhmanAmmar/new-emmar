import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { aging, type AgingRow } from "@/lib/treasury";

export const Route = createFileRoute("/treasury/reports/aging")({
  head: () => ({
    meta: [
      { title: "أعمار الديون — تقارير الخزينة" },
      { name: "description", content: "توزيع المستحقات على فئات التأخير للعملاء والموردين." },
      { property: "og:title", content: "تقرير أعمار الديون" },
      { property: "og:description", content: "المستحقات حسب فترات التأخير: جاري، 30، 60، أكثر من 60 يوم." },
    ],
  }),
  component: AgingReport,
});

function AgingReport() {
  const data = useDb();
  const [kind, setKind] = useState<"sales" | "purchase">("sales");
  const rows = aging(data, kind);

  const totals = rows.reduce(
    (acc, row) => {
      acc.b0 += row.b0;
      acc.b30 += row.b30;
      acc.b60 += row.b60;
      acc.b90 += row.b90;
      acc.total += row.total;
      return acc;
    },
    { b0: 0, b30: 0, b60: 0, b90: 0, total: 0 },
  );

  const columns: Array<Column<AgingRow>> = [
    { key: "name", header: kind === "sales" ? "العميل" : "المورد", cell: (row) => <strong>{row.name}</strong>, text: (row) => row.name },
    { key: "b0", header: "غير مستحق", cell: (row) => money(row.b0), text: (row) => String(row.b0) },
    { key: "b30", header: "1 - 30 يوم", cell: (row) => money(row.b30), text: (row) => String(row.b30) },
    { key: "b60", header: "31 - 60 يوم", cell: (row) => money(row.b60), text: (row) => String(row.b60) },
    { key: "b90", header: "أكثر من 60 يوم", cell: (row) => <span className="text-destructive">{money(row.b90)}</span>, text: (row) => String(row.b90) },
    { key: "total", header: "الإجمالي", cell: (row) => <strong className="text-primary">{money(row.total)}</strong>, text: (row) => String(row.total) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="تقرير أعمار الديون"
        description="توزيع المستحقات حسب فترات التأخير"
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <Button size="sm" variant={kind === "sales" ? "default" : "ghost"} onClick={() => setKind("sales")}>
              مستحقات العملاء
            </Button>
            <Button size="sm" variant={kind === "purchase" ? "default" : "ghost"} onClick={() => setKind("purchase")}>
              مستحقات الموردين
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="غير مستحق" value={money(totals.b0)} tone="muted" />
        <StatCard label="1 - 30 يوم" value={money(totals.b30)} />
        <StatCard label="31 - 60 يوم" value={money(totals.b60)} tone="accent" />
        <StatCard label="أكثر من 60 يوم" value={money(totals.b90)} tone="danger" />
        <StatCard label="الإجمالي" value={money(totals.total)} />
      </div>

      <DataTable title="أعمار الديون" data={rows} columns={columns} rowId={(row) => row.partyId} />
    </div>
  );
}
