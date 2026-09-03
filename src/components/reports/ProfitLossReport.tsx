import { Printer, TrendingDown, TrendingUp, Wallet, Receipt } from "lucide-react";
import { useMemo } from "react";

import { ChartCard, DonutChart, GroupedBarChart } from "@/components/analytics/ChartCard";
import { PeriodFilter, periodText, usePeriod } from "@/components/analytics/PeriodFilter";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateFmt, money, num } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { profitAndLoss } from "@/lib/pnl";
import { printHtml } from "@/lib/printDoc";

interface Row {
  label: string;
  value: number;
  tone?: "plus" | "minus" | "total" | "sub";
  hint?: string;
}

/** تقرير الأرباح والخسائر: الإيرادات بعد الخصم والضريبة − تكلفة المبيعات − كل المصروفات */
export function ProfitLossReport() {
  const data = useDb();
  const [range, setRange] = usePeriod("period:pnl", "year");
  const pnl = useMemo(() => profitAndLoss(data, range.from, range.to), [data, range.from, range.to]);

  const revenueRows: Row[] = [
    { label: "إجمالى المبيعات (قبل الخصم)", value: pnl.salesGross, tone: "plus" },
    { label: "الخصومات على المبيعات", value: -pnl.salesDiscount, tone: "minus" },
    { label: "بنود إضافية (تحميل / نقل ...)", value: pnl.salesCharges, tone: "plus" },
    { label: "مرتجعات المبيعات", value: -pnl.salesReturns, tone: "minus" },
    { label: "صافى الإيرادات (بدون ضريبة)", value: pnl.revenue, tone: "total" },
  ];

  const cogsRows: Row[] = [
    { label: "مخزون أول الفترة", value: pnl.openingStock, tone: "plus" },
    { label: "صافى المشتريات (بعد الخصم والمرتجع)", value: pnl.netPurchases, tone: "plus" },
    { label: "مخزون آخر الفترة", value: -pnl.closingStock, tone: "minus" },
    { label: "تكلفة المبيعات", value: pnl.cogs, tone: "total" },
  ];

  const expenseRows: Row[] = [
    ...pnl.expenseGroups.map<Row>((g) => ({
      label: g.label,
      value: g.amount,
      tone: "sub",
      hint: `${num(g.count)} مستند`,
    })),
    { label: "رسوم التحويلات البنكية", value: pnl.transferFees, tone: "sub" },
    { label: "إجمالى المصروفات", value: pnl.expenses + pnl.transferFees, tone: "total" },
  ];

  const mix = [
    { label: "تكلفة المبيعات", value: Math.max(0, Math.round(pnl.cogs)) },
    { label: "المصروفات", value: Math.max(0, Math.round(pnl.expenses + pnl.transferFees)) },
    { label: "صافى الربح", value: Math.max(0, Math.round(pnl.netProfit)) },
  ].filter((r) => r.value > 0);

  const bars = [
    { label: "الإيرادات", value: Math.round(pnl.revenue) },
    { label: "تكلفة المبيعات", value: Math.round(pnl.cogs) },
    { label: "المصروفات", value: Math.round(pnl.expenses + pnl.transferFees) },
    { label: "صافى الربح", value: Math.round(pnl.netProfit) },
  ];

  const print = () => {
    const table = (title: string, rows: Row[]) => `
      <h1>${title}</h1>
      <table><thead><tr><th>البيان</th><th>المبلغ (ج.م)</th></tr></thead><tbody>
      ${rows
        .map(
          (r) =>
            `<tr${r.tone === "total" ? ' style="background:#eef4ef;font-weight:700"' : ""}><td>${r.label}</td><td style="text-align:left">${money(r.value)}</td></tr>`,
        )
        .join("")}
      </tbody></table>`;
    printHtml(
      "تقرير الأرباح والخسائر",
      `<table class="kv"><tbody><tr><td>الفترة</td><td>${dateFmt(range.from)} — ${dateFmt(range.to)}</td>
        <td>عدد فواتير البيع</td><td>${num(pnl.salesCount)}</td>
        <td>عدد فواتير الشراء</td><td>${num(pnl.purchasesCount)}</td></tr></tbody></table>
      ${table("الإيرادات", revenueRows)}
      ${table("تكلفة المبيعات", cogsRows)}
      ${table("المصروفات", expenseRows)}
      <table style="margin-top:16px"><tbody>
        <tr><th>الربح الإجمالى</th><td style="text-align:left">${money(pnl.grossProfit)} (${pnl.grossMarginPct.toFixed(1)}%)</td></tr>
        <tr style="background:#eef4ef;font-weight:700"><th>صافى الربح / الخسارة</th><td style="text-align:left">${money(pnl.netProfit)} (${pnl.netMarginPct.toFixed(1)}%)</td></tr>
        <tr><th>الضريبة المستحقة للمصلحة</th><td style="text-align:left">${money(pnl.taxDue)}</td></tr>
      </tbody></table>
      <div class="sig"><div>المحاسب</div><div>المدير المالى</div><div>الإدارة</div></div>`,
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="تقرير الأرباح والخسائر"
        description="مقارنة إيرادات المبيعات بعد الخصومات والضريبة بالمشتريات وأرصدة المخزون وكل المصروفات المنصرفة"
        actions={
          <Button type="button" className="gap-1.5" onClick={print}>
            <Printer className="size-4" />
            طباعة التقرير
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
        <PeriodFilter value={range} onChange={setRange} />
        <span className="text-xs font-semibold text-muted-foreground">{periodText(range)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="صافى الإيرادات"
          value={money(pnl.revenue)}
          hint={`${num(pnl.salesCount)} فاتورة — ضريبة مبيعات: ${money(pnl.salesTax)}`}
          icon={<Receipt className="size-4" />}
        />
        <StatCard
          label="تكلفة المبيعات"
          value={money(pnl.cogs)}
          hint={`صافى مشتريات: ${money(pnl.netPurchases)}`}
          tone="muted"
        />
        <StatCard
          label="إجمالى المصروفات"
          value={money(pnl.expenses + pnl.transferFees)}
          hint={pnl.advances > 0 ? `سلف موظفين (غير محمّلة): ${money(pnl.advances)}` : "رواتب ونثريات ومصروفات عامة"}
          tone="danger"
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label={pnl.netProfit >= 0 ? "صافى الربح" : "صافى الخسارة"}
          value={money(pnl.netProfit)}
          hint={`هامش صافى: ${pnl.netMarginPct.toFixed(1)}% — هامش إجمالى: ${pnl.grossMarginPct.toFixed(1)}%`}
          tone={pnl.netProfit >= 0 ? "primary" : "danger"}
          icon={pnl.netProfit >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="مقارنة الإيرادات بالتكاليف" hint="الإيرادات مقابل تكلفة المبيعات والمصروفات" height={250}>
            <GroupedBarChart data={bars} series={[{ key: "value", name: "المبلغ" }]} />
          </ChartCard>
        </div>
        <ChartCard title="توزيع الإيرادات" hint="نصيب التكلفة والمصروفات والربح" height={250}>
          <DonutChart data={mix} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PnlCard title="الإيرادات" rows={revenueRows} />
        <PnlCard title="تكلفة المبيعات" rows={cogsRows} />
        <PnlCard title="المصروفات المنصرفة" rows={expenseRows} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">النتيجة النهائية</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Line label="الربح الإجمالى (إيرادات − تكلفة)" value={money(pnl.grossProfit)} />
          <Line label="إجمالى التكاليف والمصروفات" value={money(pnl.totalCosts)} />
          <Line
            label={pnl.netProfit >= 0 ? "صافى الربح" : "صافى الخسارة"}
            value={money(pnl.netProfit)}
            strong
          />
          <Line label="الضريبة المستحقة للمصلحة" value={money(pnl.taxDue)} />
          <Line label="ضريبة المبيعات المحصلة" value={money(pnl.salesTax)} />
          <Line label="ضريبة المشتريات (خصم)" value={money(pnl.purchasesTax)} />
          <Line label="متحصلات المبيعات" value={money(pnl.salesCollected)} />
          <Line label="مبيعات آجلة لم تُحصّل" value={money(pnl.salesRemaining)} />
        </CardContent>
      </Card>
    </div>
  );
}

function PnlCard({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className={
              row.tone === "total"
                ? "mt-1 flex items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-bold text-primary"
                : "flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm odd:bg-muted/40"
            }
          >
            <span className="flex flex-col">
              <span>{row.label}</span>
              {row.hint ? <span className="text-xs text-muted-foreground">{row.hint}</span> : null}
            </span>
            <span className={row.tone === "minus" ? "font-semibold text-destructive" : "font-semibold"}>
              {money(row.value)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={
        strong
          ? "flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-bold text-primary"
          : "flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
      }
    >
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
