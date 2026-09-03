import { useMemo } from "react";
import { Receipt } from "lucide-react";

import { ChartCard, GroupedBarChart } from "@/components/analytics/ChartCard";
import { usePeriod } from "@/components/analytics/PeriodFilter";
import { ReportShell, ReportTable, printTableHtml, type ReportColumn } from "@/components/reports/ReportShell";
import { StatCard } from "@/components/treasury/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateFmt, money } from "@/lib/format";
import { vatReturn } from "@/lib/ledger";
import { useDb } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";

type MonthRow = { month: string; output: number; input: number; due: number };

/** الإقرار الضريبى: ضريبة المبيعات المستحقة مقابل ضريبة المشتريات القابلة للخصم */
export function VatReport() {
  const data = useDb();
  const [range, setRange] = usePeriod("period:vat", "quarter");
  const vat = useMemo(() => vatReturn(data, range.from, range.to), [data, range.from, range.to]);

  const columns: ReportColumn<MonthRow>[] = [
    { key: "month", label: "الشهر", cell: (r) => r.month, text: (r) => r.month },
    { key: "output", label: "ضريبة مبيعات (مستحقة)", numeric: true, cell: (r) => money(r.output), text: (r) => money(r.output) },
    { key: "input", label: "ضريبة مشتريات (خصم)", numeric: true, cell: (r) => money(r.input), text: (r) => money(r.input) },
    { key: "due", label: "الصافى المستحق للمصلحة", numeric: true, cell: (r) => money(r.due), text: (r) => money(r.due) },
  ];

  const totals = ["الإجمالى", money(vat.netOutput), money(vat.netInput), money(vat.due)];

  const rows = [
    { label: "صافى المبيعات الخاضعة للضريبة", value: vat.salesNet },
    { label: "ضريبة المبيعات المحصلة", value: vat.outputTax },
    { label: "مرتجعات المبيعات", value: -vat.salesReturnsNet },
    { label: "ضريبة مرتجعات المبيعات", value: -vat.outputTaxReturns },
    { label: "صافى ضريبة المبيعات", value: vat.netOutput },
    { label: "صافى المشتريات", value: vat.purchasesNet },
    { label: "ضريبة المشتريات القابلة للخصم", value: vat.inputTax },
    { label: "ضريبة مرتجعات المشتريات", value: -vat.inputTaxReturns },
    { label: "صافى ضريبة المشتريات", value: vat.netInput },
  ];

  const print = () =>
    printHtml(
      "الإقرار الضريبى (القيمة المضافة)",
      `<h1>الإقرار الضريبى — ضريبة القيمة المضافة</h1>
       <table class="kv"><tbody><tr><td>الفترة</td><td>${dateFmt(range.from)} — ${dateFmt(range.to)}</td>
       <td>ضريبة مستحقة</td><td>${money(vat.netOutput)}</td><td>ضريبة خصم</td><td>${money(vat.netInput)}</td></tr></tbody></table>
       <table><thead><tr><th>البيان</th><th>المبلغ (ج.م)</th></tr></thead><tbody>
       ${rows.map((r) => `<tr><td>${r.label}</td><td style="text-align:left">${money(r.value)}</td></tr>`).join("")}
       <tr style="background:#eef4ef;font-weight:700"><td>الضريبة المستحقة السداد</td><td style="text-align:left">${money(vat.due)}</td></tr>
       </tbody></table>
       <h1>التوزيع الشهرى</h1>
       ${printTableHtml(columns, vat.monthly, totals)}
       <div class="sig"><div>المحاسب</div><div>المدير المالى</div><div>الإدارة</div></div>`,
    );

  const bars = vat.monthly.map((m) => ({ label: m.month, output: Math.round(m.output), input: Math.round(m.input) }));

  return (
    <ReportShell
      title="الإقرار الضريبى (القيمة المضافة)"
      description="ضريبة المبيعات المحصلة مقابل ضريبة المشتريات القابلة للخصم وصافى المستحق لمصلحة الضرائب"
      range={range}
      onRangeChange={setRange}
      onPrint={print}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="صافى ضريبة المبيعات" value={money(vat.netOutput)} icon={<Receipt className="size-4" />} />
        <StatCard label="صافى ضريبة المشتريات" value={money(vat.netInput)} tone="muted" />
        <StatCard label="الضريبة المستحقة السداد" value={money(vat.due)} tone={vat.due >= 0 ? "danger" : "primary"} />
        <StatCard label="صافى المبيعات الخاضعة" value={money(vat.salesNet)} tone="accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">تفاصيل الإقرار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm odd:bg-muted/40">
                <span>{r.label}</span>
                <span className="font-semibold tabular-nums">{money(r.value)}</span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-bold text-primary">
              <span>الضريبة المستحقة السداد</span>
              <span className="tabular-nums">{money(vat.due)}</span>
            </div>
          </CardContent>
        </Card>

        <ChartCard title="الضريبة شهرياً" hint="ضريبة مبيعات مقابل ضريبة مشتريات" height={260}>
          <GroupedBarChart
            data={bars}
            series={[
              { key: "output", name: "ضريبة مبيعات" },
              { key: "input", name: "ضريبة مشتريات" },
            ]}
          />
        </ChartCard>
      </div>

      <ReportTable columns={columns} rows={vat.monthly} rowKey={(r) => r.month} footer={totals} />
    </ReportShell>
  );
}
