import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Banknote,
  BadgeDollarSign,
  Landmark,
  ListChecks,
  ScrollText,
  Wallet,
} from "lucide-react";

import { ChartCard, DonutChart, FlowAreaChart, GroupedBarChart, TrendLineChart } from "@/components/analytics/ChartCard";
import { KpiCard } from "@/components/analytics/KpiCard";
import { PageHeader } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agingBuckets, cashFlowSeries, dailyFlowSeries, deltaPct, safeMixSeries } from "@/lib/analytics";
import { dateFmt, money, num } from "@/lib/format";
import { SAFE_TYPE_LABEL, useDb } from "@/lib/mockDb";
import { aging, safeBalance, safeMovements, totalsByType } from "@/lib/treasury";

export function TreasuryDashboard() {
  const data = useDb();
  const totals = totalsByType(data);
  const movements = [...safeMovements(data)].reverse();
  const monthly = cashFlowSeries(data, 6);
  const daily = dailyFlowSeries(data, 14);
  const safeMix = safeMixSeries(data);
  const receivables = aging(data, "sales");
  const payables = aging(data, "purchase");

  const totalBalance = data.safes.reduce((acc, safe) => acc + safeBalance(data, safe.id), 0);
  const receivablesTotal = receivables.reduce((acc, row) => acc + row.total, 0);
  const payablesTotal = payables.reduce((acc, row) => acc + row.total, 0);
  const overdue = receivables.reduce((acc, row) => acc + row.b30 + row.b60 + row.b90, 0);
  const openShifts = data.shifts.filter((s) => s.status === "open");
  const monthIn = Number(monthly.at(-1)?.inflow ?? 0);
  const monthOut = Number(monthly.at(-1)?.outflow ?? 0);
  const coverage = monthOut > 0 ? totalBalance / monthOut : 0;
  const collectRate = receivablesTotal + overdue > 0 ? (1 - overdue / Math.max(1, receivablesTotal)) * 100 : 100;

  const topReceivables = receivables
    .slice(0, 6)
    .map((r) => ({ label: r.name, value: Math.round(r.total) }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="لوحة الخزينة والمعاملات المالية"
        description="مؤشرات ورسومات تحليلية لحظية للأرصدة والتدفقات النقدية بالجنيه المصري"
        actions={
          <>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/treasury/receipts/new">
                <BadgeDollarSign className="size-4" />
                سند قبض
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/treasury/payments/new">
                <Banknote className="size-4" />
                سند صرف
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/treasury/transfers/new">
                <ArrowLeftRight className="size-4" />
                تحويل
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link to="/reports">
                <ScrollText className="size-4" />
                التقارير
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="إجمالي الأرصدة"
          value={money(totalBalance)}
          hint={`نقدي: ${money(totals.cash)} — بنوك ومحافظ: ${money(totals.bank + totals.wallet)}`}
          icon={<Wallet className="size-4" />}
          spark={monthly}
          sparkKey="net"
          delta={deltaPct(monthly, "net")}
        />
        <KpiCard
          label="مقبوضات الشهر"
          value={money(monthIn)}
          hint={`مدفوعات: ${money(monthOut)}`}
          tone="accent"
          icon={<BadgeDollarSign className="size-4" />}
          spark={monthly}
          sparkKey="inflow"
          delta={deltaPct(monthly, "inflow")}
        />
        <KpiCard
          label="مستحق للتحصيل"
          value={money(receivablesTotal)}
          hint={`متأخر أكثر من 30 يوم: ${money(overdue)}`}
          tone="danger"
          delta={deltaPct(monthly, "outflow")}
          deltaGoodWhenUp={false}
        />
        <KpiCard
          label="مستحق للسداد"
          value={money(payablesTotal)}
          hint={`تغطية المصروفات: ${num(coverage)} شهر`}
          tone="muted"
          icon={<Landmark className="size-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="التدفق النقدي — آخر 6 أشهر" hint="مقارنة المقبوضات والمدفوعات شهرياً" height={260}>
            <FlowAreaChart
              data={monthly}
              series={[
                { key: "inflow", name: "مقبوضات" },
                { key: "outflow", name: "مدفوعات", color: "var(--color-destructive, #c0453b)" },
              ]}
            />
          </ChartCard>
        </div>
        <ChartCard title="توزيع الأرصدة على الخزن" hint="نِسب السيولة بين الخزن والبنوك" height={260}>
          <DonutChart data={safeMix} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="صافي الحركة اليومية" hint="آخر 14 يوم بحركة فعلية" height={230}>
            <TrendLineChart data={daily} dataKey="net" name="الصافي" />
          </ChartCard>
        </div>
        <ChartCard title="أعمار ديون العملاء" hint="توزيع المستحقات على الشرائح الزمنية" height={230}>
          <GroupedBarChart data={agingBuckets(data, "sales")} series={[{ key: "value", name: "المستحق" }]} />
        </ChartCard>
      </div>

      <ChartCard title="أكبر العملاء المدينين" hint="أعلى 6 أرصدة مستحقة للتحصيل" height={230}>
        <GroupedBarChart
          data={topReceivables}
          vertical
          series={[{ key: "value", name: "الرصيد المستحق", color: "var(--color-accent, #d3a13a)" }]}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">أرصدة الخزن والحسابات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.safes.map((safe) => (
              <Link
                key={safe.id}
                to="/treasury/statement"
                search={{ safe: safe.id }}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
              >
                <span className="flex flex-col">
                  <strong className="font-semibold">{safe.name}</strong>
                  <span className="text-xs text-muted-foreground">
                    {SAFE_TYPE_LABEL[safe.type]} — {safe.code}
                  </span>
                </span>
                <span className="font-bold text-primary">{money(safeBalance(data, safe.id))}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">أحدث الحركات</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/treasury/statement" search={{ safe: undefined }}>
                كشف الحركة
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {movements.slice(0, 8).map((move) => (
              <div
                key={move.id}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm odd:bg-muted/40"
              >
                <span className="flex flex-col">
                  <strong className="text-[13px] font-medium">{move.description}</strong>
                  <span className="text-xs text-muted-foreground">
                    {dateFmt(move.date)} — {move.docNo}
                  </span>
                </span>
                <span className={move.debit ? "font-semibold text-primary" : "font-semibold text-destructive"}>
                  {money(move.debit || move.credit)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">الورديات المفتوحة ومؤشرات التحصيل</CardTitle>
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link to="/treasury/shifts">
                <ListChecks className="size-4" />
                التقفيل
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">نسبة التحصيل فى الموعد</span>
                <strong>{collectRate.toFixed(1)}%</strong>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, collectRate))}%` }} />
              </div>
            </div>
            {openShifts.length === 0 ? (
              <p className="p-3 text-center text-sm text-muted-foreground">لا توجد ورديات مفتوحة حالياً</p>
            ) : (
              openShifts.map((shift) => {
                const safe = data.safes.find((s) => s.id === shift.safeId);
                const user = data.users.find((u) => u.id === shift.userId);
                return (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm"
                  >
                    <span className="flex flex-col">
                      <strong>{safe?.name}</strong>
                      <span className="text-xs text-muted-foreground">
                        {shift.no} — {user?.name}
                      </span>
                    </span>
                    <span className="font-bold">{money(safeBalance(data, shift.safeId))}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
