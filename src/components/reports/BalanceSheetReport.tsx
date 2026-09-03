import { useMemo } from "react";
import { Landmark, Scale } from "lucide-react";

import { DonutChart, ChartCard } from "@/components/analytics/ChartCard";
import { usePeriod } from "@/components/analytics/PeriodFilter";
import { ReportShell } from "@/components/reports/ReportShell";
import { StatCard } from "@/components/treasury/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateFmt, money } from "@/lib/format";
import { balanceSheet, buildJournal } from "@/lib/ledger";
import { useDb } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";

/** قائمة المركز المالى (الميزانية العمومية) حتى تاريخ نهاية الفترة */
export function BalanceSheetReport() {
  const data = useDb();
  const [range, setRange] = usePeriod("period:balance-sheet", "year");
  const bs = useMemo(() => balanceSheet(data, buildJournal(data), range.to), [data, range.to]);

  const section = (title: string, rows: { label: string; value: number }[], total: number) => `
    <h1>${title}</h1>
    <table><thead><tr><th>البيان</th><th>القيمة (ج.م)</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r.label}</td><td style="text-align:left">${money(r.value)}</td></tr>`).join("")}
    <tr style="background:#eef4ef;font-weight:700"><td>الإجمالى</td><td style="text-align:left">${money(total)}</td></tr>
    </tbody></table>`;

  const print = () =>
    printHtml(
      "قائمة المركز المالى",
      `<h1>قائمة المركز المالى (الميزانية العمومية)</h1>
       <table class="kv"><tbody><tr><td>حتى تاريخ</td><td>${dateFmt(range.to)}</td>
       <td>إجمالى الأصول</td><td>${money(bs.totalAssets)}</td>
       <td>الخصوم + حقوق الملكية</td><td>${money(bs.totalLiabilities + bs.totalEquity)}</td></tr></tbody></table>
       ${section("الأصول", bs.assets, bs.totalAssets)}
       ${section("الخصوم (الالتزامات)", bs.liabilities, bs.totalLiabilities)}
       ${section("حقوق الملكية", bs.equity, bs.totalEquity)}
       <div class="sig"><div>المحاسب</div><div>المدير المالى</div><div>الإدارة</div></div>`,
    );

  const mix = bs.assets.map((a) => ({ label: a.label, value: Math.max(0, Math.round(a.value)) })).filter((r) => r.value > 0);

  return (
    <ReportShell
      title="قائمة المركز المالى"
      description="الأصول والخصوم وحقوق الملكية حتى تاريخ نهاية الفترة المختارة"
      range={range}
      onRangeChange={setRange}
      onPrint={print}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالى الأصول" value={money(bs.totalAssets)} icon={<Landmark className="size-4" />} />
        <StatCard label="إجمالى الخصوم" value={money(bs.totalLiabilities)} tone="danger" />
        <StatCard label="حقوق الملكية" value={money(bs.totalEquity)} tone="accent" />
        <StatCard
          label="فرق التوازن"
          value={Math.abs(bs.difference) < 1 ? "متوازن" : money(bs.difference)}
          tone={Math.abs(bs.difference) < 1 ? "primary" : "danger"}
          icon={<Scale className="size-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Section title="الأصول" rows={bs.assets} total={bs.totalAssets} />
        <Section title="الخصوم (الالتزامات)" rows={bs.liabilities} total={bs.totalLiabilities} />
        <Section title="حقوق الملكية" rows={bs.equity} total={bs.totalEquity} />
      </div>

      {mix.length > 0 ? (
        <ChartCard title="توزيع الأصول" hint="نصيب النقدية والعملاء والمخزون من إجمالى الأصول" height={250}>
          <DonutChart data={mix} />
        </ChartCard>
      ) : null}
    </ReportShell>
  );
}

function Section({ title, rows, total }: { title: string; rows: { label: string; value: number }[]; total: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">لا توجد أرصدة</p>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm odd:bg-muted/40">
              <span>{r.label}</span>
              <span className="font-semibold tabular-nums">{money(r.value)}</span>
            </div>
          ))
        )}
        <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-bold text-primary">
          <span>الإجمالى</span>
          <span className="tabular-nums">{money(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
