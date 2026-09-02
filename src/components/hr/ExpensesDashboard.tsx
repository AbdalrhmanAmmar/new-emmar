import { useNavigate } from "@tanstack/react-router";
import { Plus, Receipt, Tags, Wallet } from "lucide-react";

import { ChartCard, DonutChart, GroupedBarChart } from "@/components/analytics/ChartCard";
import { KpiCard } from "@/components/analytics/KpiCard";
import { PeriodFilter, periodText, usePeriodDb } from "@/components/analytics/PeriodFilter";
import { PageHeader } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateFmt, money } from "@/lib/format";
import { currentMonth, employeeName, expenseItemName, inPeriod, monthRange } from "@/lib/hr";
import { EXPENSE_KIND_LABEL, useDb } from "@/lib/mockDb";

function lastMonths(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i += 1) {
    out.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

/** لوحة المصروفات: مؤشرات ورسومات تحليلية */
export function ExpensesDashboard() {
  const rawDb = useDb();
  const { range: period, setRange: setPeriod, scoped: data } = usePeriodDb(rawDb, "period:expenses");
  const navigate = useNavigate();

  const posted = data.expenses.filter((e) => e.status !== "cancelled");
  const month = currentMonth();
  const range = monthRange(month);
  const monthRows = posted.filter((e) => inPeriod(e.date, range));

  const total = posted.reduce((a, e) => a + e.amount, 0);
  const monthTotal = monthRows.reduce((a, e) => a + e.amount, 0);
  const salaries = monthRows.filter((e) => e.kind === "salary").reduce((a, e) => a + e.amount, 0);
  const petty = monthRows.filter((e) => e.kind === "petty").reduce((a, e) => a + e.amount, 0);

  const trend = lastMonths(6).map((m) => {
    const r = monthRange(m);
    const rows = posted.filter((e) => inPeriod(e.date, r));
    return {
      label: m.slice(5) + "/" + m.slice(2, 4),
      المصروفات: Math.round(rows.reduce((a, e) => a + e.amount, 0)),
      الرواتب: Math.round(rows.filter((e) => e.kind === "salary").reduce((a, e) => a + e.amount, 0)),
    };
  });

  const byItem = data.expenseItems
    .map((i) => ({
      label: i.name,
      value: Math.round(posted.filter((e) => e.itemId === i.id).reduce((a, e) => a + e.amount, 0)),
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const byKind = (Object.keys(EXPENSE_KIND_LABEL) as Array<keyof typeof EXPENSE_KIND_LABEL>)
    .map((k) => ({
      label: EXPENSE_KIND_LABEL[k],
      value: Math.round(posted.filter((e) => e.kind === k).reduce((a, e) => a + e.amount, 0)),
    }))
    .filter((r) => r.value > 0);

  const latest = [...posted].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  return (
    <div className="space-y-4">
      <PageHeader
        title="لوحة المصروفات العامة والنثريات"
        description="تحليل المنصرف بالبنود والأنواع والاتجاه الشهرى"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => navigate({ to: "/expenses/items" })}>
              <Tags className="size-4" />
              بنود الصرف
            </Button>
            <Button className="gap-1.5" onClick={() => navigate({ to: "/expenses/new" })}>
              <Plus className="size-4" />
              مصروف جديد
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
        <PeriodFilter value={period} onChange={setPeriod} />
        <span className="text-xs font-semibold text-muted-foreground">{periodText(period)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="مصروفات الشهر" value={money(monthTotal)} icon={<Receipt className="size-4" />} spark={trend} sparkKey="المصروفات" deltaGoodWhenUp={false} />
        <KpiCard label="رواتب وأجور الشهر" value={money(salaries)} tone="accent" icon={<Wallet className="size-4" />} />
        <KpiCard label="نثريات الشهر" value={money(petty)} tone="muted" />
        <KpiCard label="إجمالى المصروفات" value={money(total)} tone="danger" hint={`${posted.length} مستند`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="اتجاه المصروفات (6 أشهر)" hint="إجمالى المنصرف مقابل الرواتب">
          <GroupedBarChart
            data={trend}
            series={[
              { key: "المصروفات", name: "إجمالى المصروفات" },
              { key: "الرواتب", name: "رواتب وأجور" },
            ]}
          />
        </ChartCard>
        <ChartCard title="التوزيع حسب النوع">
          <DonutChart data={byKind} />
        </ChartCard>
      </div>

      <ChartCard title="أعلى بنود الصرف" hint="أكبر 6 بنود من حيث المنصرف">
        <GroupedBarChart data={byItem} series={[{ key: "value", name: "المنصرف" }]} vertical />
      </ChartCard>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">أحدث حركات الصرف</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {latest.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">لا توجد مصروفات بعد</p>
          ) : null}
          {latest.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{expenseItemName(data, e.itemId)}</p>
                <p className="text-xs text-muted-foreground">
                  {e.no} • {dateFmt(e.date)} • {e.employeeId ? employeeName(data, e.employeeId) : e.beneficiary || "—"}
                </p>
              </div>
              <span className="font-semibold text-destructive">{money(e.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
