import { useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Plus, Users, Wallet } from "lucide-react";

import { ChartCard, DonutChart, GroupedBarChart } from "@/components/analytics/ChartCard";
import { KpiCard } from "@/components/analytics/KpiCard";
import { PeriodFilter, periodText, usePeriodDb } from "@/components/analytics/PeriodFilter";
import { PageHeader } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money, num, today } from "@/lib/format";
import { currentMonth, monthRange, payroll } from "@/lib/hr";
import { ATTENDANCE_LABEL, useDb, type AttendanceStatus } from "@/lib/mockDb";

/** لوحة الموظفين: مؤشرات الحضور والمستحقات */
export function HrDashboard() {
  const rawDb = useDb();
  const { range: period, setRange: setPeriod, scoped: data } = usePeriodDb(rawDb, "period:hr");
  const navigate = useNavigate();

  const month = currentMonth();
  const range = monthRange(month);
  const employees = data.employees.filter((e) => e.active);

  const totals = employees.reduce(
    (acc, e) => {
      const p = payroll(data, e, range);
      acc.due += p.netDue;
      acc.paid += p.paidSalaries;
      acc.balance += p.balance;
      acc.advances += p.advances;
      return acc;
    },
    { due: 0, paid: 0, balance: 0, advances: 0 },
  );

  const day = today();
  const dayRows = data.attendance.filter((a) => a.date === day);
  const attDist = (Object.keys(ATTENDANCE_LABEL) as AttendanceStatus[])
    .map((s) => ({ label: ATTENDANCE_LABEL[s], value: dayRows.filter((a) => a.status === s).length }))
    .filter((r) => r.value > 0);

  const byDept = Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).map((d) => {
    const list = employees.filter((e) => e.department === d);
    return {
      label: d,
      "عدد الموظفين": list.length,
      "المستحقات": Math.round(list.reduce((a, e) => a + payroll(data, e, range).netDue, 0)),
    };
  });

  const topBalances = employees
    .map((e) => ({ emp: e, p: payroll(data, e, range) }))
    .filter((r) => r.p.balance > 0)
    .sort((a, b) => b.p.balance - a.p.balance)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <PageHeader
        title="لوحة الموظفين"
        description="حضور اليوم ومستحقات الشهر والمدفوع والسلف"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => navigate({ to: "/hr/attendance" })}>
              <CalendarCheck className="size-4" />
              تحضير اليوم
            </Button>
            <Button className="gap-1.5" onClick={() => navigate({ to: "/hr/employees/new" })}>
              <Plus className="size-4" />
              موظف جديد
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
        <PeriodFilter value={period} onChange={setPeriod} />
        <span className="text-xs font-semibold text-muted-foreground">{periodText(period)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="عدد الموظفين" value={num(employees.length)} icon={<Users className="size-4" />} />
        <KpiCard label="مستحقات الشهر" value={money(totals.due)} tone="accent" icon={<Wallet className="size-4" />} />
        <KpiCard label="المدفوع للموظفين" value={money(totals.paid)} />
        <KpiCard label="المتبقى عليهم" value={money(totals.balance)} tone="danger" deltaGoodWhenUp={false} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title={`حضور اليوم ${day}`} hint="توزيع حالات التحضير">
          {attDist.length ? (
            <DonutChart data={attDist} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              لم يتم تحضير أى موظف اليوم
            </div>
          )}
        </ChartCard>
        <ChartCard title="الموظفون والمستحقات حسب القسم">
          <GroupedBarChart
            data={byDept}
            series={[
              { key: "المستحقات", name: "مستحقات الشهر" },
              { key: "عدد الموظفين", name: "عدد الموظفين" },
            ]}
          />
        </ChartCard>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">أعلى مستحقات متبقية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {topBalances.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">لا توجد مستحقات متبقية</p>
          ) : null}
          {topBalances.map(({ emp, p }) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => navigate({ to: "/hr/employees/$id", params: { id: emp.id } })}
              className="flex w-full items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
            >
              <div className="text-start">
                <p className="font-medium">{emp.name}</p>
                <p className="text-xs text-muted-foreground">
                  {emp.jobTitle} • مستحق {money(p.netDue)} • مدفوع {money(p.paidSalaries)}
                </p>
              </div>
              <span className="font-semibold text-destructive">{money(p.balance)}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
