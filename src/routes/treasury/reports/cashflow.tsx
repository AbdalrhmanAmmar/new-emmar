import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { dateFmt, money } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { cashFlow, type FlowRow } from "@/lib/treasury";

export const Route = createFileRoute("/treasury/reports/cashflow")({
  head: () => ({
    meta: [
      { title: "تقرير التدفق النقدي — الخزينة" },
      { name: "description", content: "المقبوضات والمدفوعات والصافي النقدي يومياً أو شهرياً لكل خزينة." },
      { property: "og:title", content: "تقرير التدفق النقدي" },
      { property: "og:description", content: "تحليل الداخل والخارج وصافي التدفق النقدي بالجنيه المصري." },
    ],
  }),
  component: CashFlowReport,
});

function CashFlowReport() {
  const data = useDb();
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");
  const [safeId, setSafeId] = useState<string>("");

  const rows = cashFlow(data, groupBy, safeId || undefined);
  const totals = rows.reduce(
    (acc, row) => {
      acc.inflow += row.inflow;
      acc.outflow += row.outflow;
      return acc;
    },
    { inflow: 0, outflow: 0 },
  );

  const columns: Array<Column<FlowRow>> = [
    {
      key: "key",
      header: groupBy === "day" ? "التاريخ" : "الشهر",
      cell: (row) => (groupBy === "day" ? dateFmt(row.key) : row.key),
      text: (row) => row.key,
    },
    { key: "inflow", header: "المقبوضات", cell: (row) => <span className="text-primary">{money(row.inflow)}</span>, text: (row) => String(row.inflow) },
    { key: "outflow", header: "المدفوعات", cell: (row) => <span className="text-destructive">{money(row.outflow)}</span>, text: (row) => String(row.outflow) },
    { key: "net", header: "الصافي", cell: (row) => <strong>{money(row.net)}</strong>, text: (row) => String(row.net) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="تقرير التدفق النقدي"
        description="متابعة الداخل والخارج وصافي السيولة"
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <Button size="sm" variant={groupBy === "day" ? "default" : "ghost"} onClick={() => setGroupBy("day")}>
              يومي
            </Button>
            <Button size="sm" variant={groupBy === "month" ? "default" : "ghost"} onClick={() => setGroupBy("month")}>
              شهري
            </Button>
          </div>
        }
      />

      <div className="max-w-xs space-y-1.5">
        <Label className="text-xs text-muted-foreground">الخزينة (اختياري)</Label>
        <SearchSelect
          options={[{ value: "", label: "كل الخزن" }, ...data.safes.map((s) => ({ value: s.id, label: s.name }))]}
          value={safeId}
          onChange={setSafeId}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي المقبوضات" value={money(totals.inflow)} />
        <StatCard label="إجمالي المدفوعات" value={money(totals.outflow)} tone="danger" />
        <StatCard label="صافي التدفق" value={money(totals.inflow - totals.outflow)} tone="accent" />
      </div>

      <DataTable title="التدفق النقدي" data={rows} columns={columns} rowId={(row) => row.key} />
    </div>
  );
}
