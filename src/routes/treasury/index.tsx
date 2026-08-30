import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Banknote,
  BadgeDollarSign,
  Landmark,
  ListChecks,
  Wallet,
} from "lucide-react";

import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateFmt, money } from "@/lib/format";
import { SAFE_TYPE_LABEL, useDb } from "@/lib/mockDb";
import { aging, cashFlow, safeBalance, safeMovements, totalsByType } from "@/lib/treasury";

export const Route = createFileRoute("/treasury/")({
  head: () => ({
    meta: [
      { title: "لوحة الخزينة — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "نظرة شاملة على أرصدة الخزن والتدفق النقدي اليومي والمستحقات." },
      { property: "og:title", content: "لوحة الخزينة" },
      { property: "og:description", content: "أرصدة الخزن، المقبوضات والمدفوعات، والمستحقات المتأخرة." },
    ],
  }),
  component: TreasuryDashboard,
});

function TreasuryDashboard() {
  const data = useDb();
  const totals = totalsByType(data);
  const movements = safeMovements(data);
  const flow = cashFlow(data, "day").slice(0, 7);
  const receivables = aging(data, "sales");
  const payables = aging(data, "purchase");

  const totalBalance = data.safes.reduce((acc, safe) => acc + safeBalance(data, safe.id), 0);
  const receivablesTotal = receivables.reduce((acc, row) => acc + row.total, 0);
  const payablesTotal = payables.reduce((acc, row) => acc + row.total, 0);
  const overdue = receivables.reduce((acc, row) => acc + row.b30 + row.b60 + row.b90, 0);
  const openShifts = data.shifts.filter((s) => s.status === "open");

  return (
    <div className="space-y-5">
      <PageHeader
        title="لوحة الخزينة والمعاملات المالية"
        description="متابعة لحظية للأرصدة والتدفقات النقدية بالجنيه المصري"
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
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي الأرصدة" value={money(totalBalance)} icon={<Wallet className="size-4" />} />
        <StatCard
          label="نقدي بالخزن"
          value={money(totals.cash)}
          hint={`بنوك ومحافظ: ${money(totals.bank + totals.wallet)}`}
          tone="accent"
          icon={<Landmark className="size-4" />}
        />
        <StatCard
          label="مستحق للتحصيل"
          value={money(receivablesTotal)}
          hint={`متأخر أكثر من 30 يوم: ${money(overdue)}`}
          tone="danger"
        />
        <StatCard label="مستحق للسداد" value={money(payablesTotal)} tone="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">التدفق النقدي — آخر 7 أيام</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-center text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">مقبوضات</th>
                  <th className="p-2">مدفوعات</th>
                  <th className="p-2">الصافي</th>
                </tr>
              </thead>
              <tbody>
                {flow.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      لا توجد حركات
                    </td>
                  </tr>
                ) : (
                  flow.map((row) => (
                    <tr key={row.key} className="border-t border-border/70 text-right">
                      <td className="p-2">{dateFmt(row.key)}</td>
                      <td className="p-2 text-primary">{money(row.inflow)}</td>
                      <td className="p-2 text-destructive">{money(row.outflow)}</td>
                      <td className="p-2 font-semibold">{money(row.net)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
            <CardTitle className="text-sm">الورديات المفتوحة</CardTitle>
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link to="/treasury/shifts">
                <ListChecks className="size-4" />
                التقفيل
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
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
