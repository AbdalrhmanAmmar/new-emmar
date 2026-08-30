import { Link } from "@tanstack/react-router";
import { FileText, Package, Plus, ScrollText, Users } from "lucide-react";

import {
  ChartCard,
  DonutChart,
  FlowAreaChart,
  GroupedBarChart,
  TrendLineChart,
} from "@/components/analytics/ChartCard";
import { KpiCard } from "@/components/analytics/KpiCard";
import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { deltaPct, payMethodSeries, salesKpis, salesTrendSeries } from "@/lib/analytics";
import { dateFmt, money, num } from "@/lib/format";
import { UNIT_LABEL, useDb } from "@/lib/mockDb";
import { invoiceTotalsOf, salesByCustomer, salesByProduct, salesByRep, type SalesByKeyRow } from "@/lib/sales";

export function SalesDashboard() {
  const data = useDb();
  const posted = data.salesInvoices.filter((i) => i.status === "posted");
  const kpis = salesKpis(data);
  const trend = salesTrendSeries(data, 14);
  const methods = payMethodSeries(data);
  const topProducts = salesByProduct(data)
    .slice(0, 6)
    .map((r) => ({ label: r.label, value: Math.round(r.total) }));
  const topCustomers = salesByCustomer(data)
    .slice(0, 6)
    .map((r) => ({ label: r.label, value: Math.round(r.total) }));
  const low = data.products.filter((p) => p.stock <= p.minStock);

  return (
    <div className="space-y-4">
      <PageHeader
        title="لوحة المبيعات والعملاء"
        description="مؤشرات ورسومات تحليلية للمبيعات والتحصيل وحركة الأصناف"
        actions={
          <>
            <Button asChild className="gap-1.5">
              <Link to="/sales/invoices/new">
                <Plus className="size-4" />
                فاتورة مبيعات جديدة
              </Link>
            </Button>
            <Button asChild variant="ghost" className="gap-1.5">
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
          label="إجمالي المبيعات"
          value={money(kpis.sales)}
          hint={`عدد الفواتير: ${kpis.count}`}
          icon={<FileText className="size-4" />}
          spark={trend}
          sparkKey="total"
          delta={deltaPct(trend, "total")}
        />
        <KpiCard
          label="المحصّل"
          value={money(kpis.paid)}
          hint={`نقدي/بطاقة: ${kpis.cashShare.toFixed(1)}% من المبيعات`}
          tone="accent"
          spark={trend}
          sparkKey="paid"
          delta={deltaPct(trend, "paid")}
        />
        <KpiCard
          label="المتبقي على العملاء"
          value={money(kpis.remaining)}
          hint={`مبيعات آجلة: ${kpis.creditShare.toFixed(1)}%`}
          tone="danger"
          deltaGoodWhenUp={false}
        />
        <KpiCard
          label="متوسط الفاتورة"
          value={money(kpis.avgTicket)}
          hint={`ضريبة القيمة المضافة: ${money(kpis.tax)}`}
          tone="muted"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="حركة المبيعات والتحصيل" hint="آخر 14 يوم بحركة فعلية" height={260}>
            <FlowAreaChart
              data={trend}
              series={[
                { key: "total", name: "المبيعات" },
                { key: "paid", name: "المحصّل", color: "var(--color-accent, #d3a13a)" },
              ]}
            />
          </ChartCard>
        </div>
        <ChartCard title="توزيع طرق الدفع" hint="نقدي / بطاقة / مختلط / آجل" height={260}>
          <DonutChart data={methods} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="أعلى الأصناف بيعاً" hint="أعلى 6 أصناف بقيمة البيع" height={240}>
          <GroupedBarChart data={topProducts} vertical series={[{ key: "value", name: "قيمة البيع" }]} />
        </ChartCard>
        <ChartCard title="أكبر العملاء" hint="أعلى 6 عملاء بقيمة الشراء" height={240}>
          <GroupedBarChart
            data={topCustomers}
            vertical
            series={[{ key: "value", name: "قيمة الشراء", color: "var(--color-accent, #d3a13a)" }]}
          />
        </ChartCard>
      </div>

      <ChartCard title="عدد الفواتير اليومية" hint="مؤشر كثافة الحركة" height={200}>
        <TrendLineChart data={trend} dataKey="count" name="عدد الفواتير" />
      </ChartCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="عدد العملاء" value={String(data.customers.length)} icon={<Users className="size-4" />} tone="muted" />
        <StatCard label="عدد الأصناف" value={String(data.products.length)} icon={<Package className="size-4" />} tone="muted" />
        <StatCard label="أصناف تحت حد الطلب" value={String(low.length)} tone="danger" />
      </div>


      <DataTable
        title="أحدث فواتير المبيعات"
        data={[...posted].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8)}
        rowId={(r) => r.id}
        columns={[
          { key: "no", header: "الفاتورة", cell: (r) => r.no, text: (r) => r.no },
          { key: "date", header: "التاريخ", cell: (r) => dateFmt(r.date) },
          {
            key: "customer",
            header: "العميل",
            cell: (r) => (r.customerId ? data.customers.find((c) => c.id === r.customerId)?.name : r.customerName) ?? "-",
            text: (r) => r.customerName,
          },
          { key: "total", header: "المستحق", cell: (r) => money(invoiceTotalsOf(data, r).total) },
          { key: "paid", header: "المدفوع", cell: (r) => money(invoiceTotalsOf(data, r).paid) },
        ]}
      />

      <DataTable
        title="الأصناف الأكثر بيعاً"
        data={salesByProduct(data).slice(0, 8)}
        rowId={(r) => r.key}
        columns={[
          { key: "label", header: "الصنف", cell: (r) => r.label, text: (r) => r.label },
          { key: "qty", header: "الكمية", cell: (r) => num(r.qty), align: "center" },
          { key: "total", header: "إجمالي البيع", cell: (r) => money(r.total) },
        ]}
      />

      <DataTable
        title="الأصناف تحت حد الطلب"
        data={low}
        rowId={(r) => r.id}
        emptyText="كل الأصناف فوق حد الطلب"
        columns={[
          { key: "code", header: "الكود", cell: (r) => r.code, text: (r) => r.code },
          { key: "name", header: "الصنف", cell: (r) => r.name, text: (r) => r.name },
          { key: "stock", header: "المتاح", cell: (r) => `${num(r.stock)} ${UNIT_LABEL[r.unit]}`, align: "center" },
          { key: "min", header: "حد الطلب", cell: (r) => num(r.minStock), align: "center" },
        ]}
      />
    </div>
  );
}

const REPORTS = {
  product: { title: "المبيعات حسب الصنف", label: "الصنف", rows: salesByProduct },
  rep: { title: "المبيعات حسب المندوب", label: "المندوب", rows: salesByRep },
  customer: { title: "المبيعات حسب العميل", label: "العميل", rows: salesByCustomer },
} as const;

export function SalesReport({ kind }: { kind: keyof typeof REPORTS }) {
  const data = useDb();
  const config = REPORTS[kind];
  const rows = config.rows(data);
  const total = rows.reduce((sum, r) => sum + r.total, 0);

  const columns: Array<Column<SalesByKeyRow>> = [
    { key: "label", header: config.label, cell: (r) => r.label, text: (r) => r.label },
    { key: "count", header: "عدد الحركات", cell: (r) => r.count, align: "center" },
    { key: "qty", header: "الكمية", cell: (r) => num(r.qty), align: "center" },
    { key: "total", header: "إجمالي البيع", cell: (r) => money(r.total), text: (r) => String(r.total) },
    {
      key: "share",
      header: "النسبة",
      align: "center",
      cell: (r) => `${total > 0 ? ((r.total / total) * 100).toFixed(1) : "0.0"}%`,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={config.title} description="تقرير تحليلي للفواتير المُرحّلة بالجنيه المصري" />
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="إجمالي المبيعات" value={money(total)} />
        <StatCard label="عدد السطور" value={String(rows.length)} tone="muted" />
      </div>
      <DataTable title={config.title} data={rows} columns={columns} rowId={(r) => r.key} />
    </div>
  );
}
