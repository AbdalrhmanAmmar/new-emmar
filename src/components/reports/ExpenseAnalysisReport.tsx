import { useMemo, useState } from "react";
import { Receipt, Wallet } from "lucide-react";

import { ChartCard, DonutChart, GroupedBarChart } from "@/components/analytics/ChartCard";
import { usePeriod } from "@/components/analytics/PeriodFilter";
import { ReportShell, ReportTable, printTableHtml, type ReportColumn } from "@/components/reports/ReportShell";
import { StatCard } from "@/components/treasury/PageHeader";
import { dateFmt, money } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";

interface Row {
  id: string;
  code: string;
  name: string;
  group: string;
  count: number;
  general: number;
  petty: number;
  salary: number;
  advance: number;
  total: number;
  pct: number;
}

/** تحليل المصروفات حسب بند الصرف والنوع */
export function ExpenseAnalysisReport() {
  const data = useDb();
  const [range, setRange] = usePeriod("period:expense-analysis", "quarter");
  const [q, setQ] = useState("");

  const all = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    for (const ex of data.expenses) {
      const d = String(ex.date).slice(0, 10);
      if (ex.status !== "posted" || d < range.from || d > range.to) continue;
      const item = data.expenseItems.find((i) => i.id === ex.itemId);
      const id = item?.id ?? "other";
      let row = map.get(id);
      if (!row) {
        row = {
          id,
          code: item?.code ?? "—",
          name: item?.name ?? "مصروفات أخرى",
          group: item?.group ?? "غير مصنّف",
          count: 0,
          general: 0,
          petty: 0,
          salary: 0,
          advance: 0,
          total: 0,
          pct: 0,
        };
        map.set(id, row);
      }
      const amount = Number(ex.amount || 0);
      row.count += 1;
      row[ex.kind] += amount;
      row.total += amount;
    }
    const rows = [...map.values()].sort((a, b) => b.total - a.total);
    const grand = rows.reduce((s, r) => s + r.total, 0);
    for (const r of rows) r.pct = grand > 0 ? (r.total / grand) * 100 : 0;
    return rows;
  }, [data, range.from, range.to]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((r) => [r.code, r.name, r.group].join(" ").toLowerCase().includes(term));
  }, [all, q]);

  const sum = (k: keyof Row) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);

  const columns: ReportColumn<Row>[] = [
    { key: "code", label: "كود البند", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", label: "بند الصرف", cell: (r) => r.name, text: (r) => r.name },
    { key: "group", label: "المجموعة", cell: (r) => r.group, text: (r) => r.group },
    { key: "count", label: "عدد المستندات", numeric: true, cell: (r) => String(r.count), text: (r) => String(r.count) },
    { key: "general", label: "مصروفات عامة", numeric: true, cell: (r) => money(r.general), text: (r) => money(r.general) },
    { key: "petty", label: "نثريات", numeric: true, cell: (r) => money(r.petty), text: (r) => money(r.petty) },
    { key: "salary", label: "رواتب", numeric: true, cell: (r) => money(r.salary), text: (r) => money(r.salary) },
    { key: "advance", label: "سلف", numeric: true, cell: (r) => money(r.advance), text: (r) => money(r.advance) },
    { key: "total", label: "الإجمالى", numeric: true, cell: (r) => money(r.total), text: (r) => money(r.total) },
    { key: "pct", label: "النسبة %", numeric: true, cell: (r) => `${r.pct.toFixed(1)}%`, text: (r) => `${r.pct.toFixed(1)}%` },
  ];

  const totals = [
    "الإجمالى",
    "",
    "",
    String(sum("count")),
    money(sum("general")),
    money(sum("petty")),
    money(sum("salary")),
    money(sum("advance")),
    money(sum("total")),
    "100%",
  ];

  const print = () =>
    printHtml(
      "تحليل المصروفات",
      `<h1>تحليل المصروفات حسب بند الصرف</h1>
       <table class="kv"><tbody><tr><td>الفترة</td><td>${dateFmt(range.from)} — ${dateFmt(range.to)}</td>
       <td>عدد البنود</td><td>${rows.length}</td><td>إجمالى المصروفات</td><td>${money(sum("total"))}</td></tr></tbody></table>
       ${printTableHtml(columns, rows, totals)}
       <div class="sig"><div>المحاسب</div><div>المدير المالى</div><div>الإدارة</div></div>`,
    );

  const donut = rows.slice(0, 8).map((r) => ({ label: r.name, value: Math.round(r.total) })).filter((r) => r.value > 0);
  const bars = rows.slice(0, 10).map((r) => ({ label: r.name, value: Math.round(r.total) }));

  return (
    <ReportShell
      title="تحليل المصروفات"
      description="إجمالى المصروفات موزعة على بنود الصرف والأنواع (عامة / نثريات / رواتب / سلف)"
      range={range}
      onRangeChange={setRange}
      onPrint={print}
      search={q}
      onSearchChange={setQ}
      searchPlaceholder="بحث ببند الصرف..."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالى المصروفات" value={money(sum("total"))} tone="danger" icon={<Wallet className="size-4" />} />
        <StatCard label="الرواتب" value={money(sum("salary"))} tone="muted" />
        <StatCard label="النثريات" value={money(sum("petty"))} tone="muted" />
        <StatCard label="عدد المستندات" value={String(sum("count"))} icon={<Receipt className="size-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="أكبر بنود الصرف" hint="أعلى 10 بنود من حيث القيمة" height={250}>
            <GroupedBarChart data={bars} series={[{ key: "value", name: "المبلغ" }]} />
          </ChartCard>
        </div>
        <ChartCard title="توزيع المصروفات" hint="نصيب كل بند" height={250}>
          <DonutChart data={donut} />
        </ChartCard>
      </div>

      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} footer={totals} />
    </ReportShell>
  );
}
