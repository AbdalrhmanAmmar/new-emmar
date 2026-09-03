import { useMemo, useState } from "react";
import { Boxes, TrendingUp } from "lucide-react";

import { ChartCard, GroupedBarChart } from "@/components/analytics/ChartCard";
import { usePeriod } from "@/components/analytics/PeriodFilter";
import { ReportShell, ReportTable, printTableHtml, type ReportColumn } from "@/components/reports/ReportShell";
import { StatCard } from "@/components/treasury/PageHeader";
import { dateFmt, money, num } from "@/lib/format";
import { productProfit, type ProductProfitRow } from "@/lib/ledger";
import { useDb } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";

/** ربحية الأصناف: إيراد كل صنف مقابل تكلفته وهامش الربح */
export function ProductProfitReport() {
  const data = useDb();
  const [range, setRange] = usePeriod("period:product-profit", "quarter");
  const [q, setQ] = useState("");

  const all = useMemo(() => productProfit(data, range.from, range.to), [data, range.from, range.to]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((r) => [r.code, r.name].join(" ").toLowerCase().includes(term));
  }, [all, q]);

  const sum = (k: keyof ProductProfitRow) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  const revenue = sum("revenue");
  const profit = sum("profit");

  const columns: ReportColumn<ProductProfitRow>[] = [
    { key: "code", label: "كود الصنف", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", label: "الصنف", cell: (r) => r.name, text: (r) => r.name },
    { key: "qty", label: "الكمية المباعة", numeric: true, cell: (r) => num(r.qty), text: (r) => num(r.qty) },
    { key: "avg", label: "متوسط سعر البيع", numeric: true, cell: (r) => money(r.avgPrice), text: (r) => money(r.avgPrice) },
    { key: "revenue", label: "صافى الإيراد", numeric: true, cell: (r) => money(r.revenue), text: (r) => money(r.revenue) },
    { key: "discount", label: "الخصومات", numeric: true, cell: (r) => money(r.discount), text: (r) => money(r.discount) },
    { key: "cost", label: "التكلفة", numeric: true, cell: (r) => money(r.cost), text: (r) => money(r.cost) },
    { key: "profit", label: "الربح", numeric: true, cell: (r) => money(r.profit), text: (r) => money(r.profit) },
    { key: "margin", label: "هامش الربح %", numeric: true, cell: (r) => `${r.marginPct.toFixed(1)}%`, text: (r) => `${r.marginPct.toFixed(1)}%` },
  ];

  const totals = [
    "الإجمالى",
    "",
    num(sum("qty")),
    "",
    money(revenue),
    money(sum("discount")),
    money(sum("cost")),
    money(profit),
    `${revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0"}%`,
  ];

  const print = () =>
    printHtml(
      "تقرير ربحية الأصناف",
      `<h1>تقرير ربحية الأصناف</h1>
       <table class="kv"><tbody><tr><td>الفترة</td><td>${dateFmt(range.from)} — ${dateFmt(range.to)}</td>
       <td>عدد الأصناف</td><td>${rows.length}</td><td>صافى الربح</td><td>${money(profit)}</td></tr></tbody></table>
       ${printTableHtml(columns, rows, totals)}
       <div class="sig"><div>المحاسب</div><div>المدير المالى</div><div>الإدارة</div></div>`,
    );

  const bars = rows.slice(0, 10).map((r) => ({
    label: r.name,
    revenue: Math.round(r.revenue),
    profit: Math.round(r.profit),
  }));

  return (
    <ReportShell
      title="ربحية الأصناف"
      description="إيراد وتكلفة وهامش ربح كل صنف بعد استبعاد المرتجعات"
      range={range}
      onRangeChange={setRange}
      onPrint={print}
      search={q}
      onSearchChange={setQ}
      searchPlaceholder="بحث باسم أو كود الصنف..."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="عدد الأصناف" value={String(rows.length)} icon={<Boxes className="size-4" />} />
        <StatCard label="صافى الإيراد" value={money(revenue)} tone="muted" />
        <StatCard label="إجمالى التكلفة" value={money(sum("cost"))} tone="danger" />
        <StatCard
          label="إجمالى الربح"
          value={money(profit)}
          hint={`هامش: ${revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0"}%`}
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      <ChartCard title="أعلى الأصناف ربحية" hint="الإيراد مقابل الربح لأعلى 10 أصناف" height={260}>
        <GroupedBarChart
          data={bars}
          series={[
            { key: "revenue", name: "الإيراد" },
            { key: "profit", name: "الربح" },
          ]}
        />
      </ChartCard>

      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} footer={totals} />
    </ReportShell>
  );
}
