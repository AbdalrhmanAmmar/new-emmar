import { Link } from "@tanstack/react-router";
import { Banknote, Package, Plus, ScrollText, Truck } from "lucide-react";

import { ChartCard, GroupedBarChart, TrendLineChart } from "@/components/analytics/ChartCard";
import { KpiCard } from "@/components/analytics/KpiCard";
import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { dateFmt, money, num } from "@/lib/format";
import { UNIT_LABEL, useDb, type Party } from "@/lib/mockDb";
import type { SalesByKeyRow } from "@/lib/sales";
import { purchaseKpis, purchaseTotalsOf, purchaseTrendSeries, purchasesByProduct, purchasesBySupplier, supplierStats } from "@/lib/purchases";

export function PurchasesDashboard() {
  const data = useDb();
  const kpis = purchaseKpis(data);
  const trend = purchaseTrendSeries(data, 14);
  const topProducts = purchasesByProduct(data)
    .slice(0, 6)
    .map((r) => ({ label: r.label, value: Math.round(r.total) }));
  const topSuppliers = purchasesBySupplier(data)
    .slice(0, 6)
    .map((r) => ({ label: r.label, value: Math.round(r.total) }));
  const low = data.products.filter((p) => p.stock <= p.minStock);

  const supplierColumns: Array<Column<Party>> = [
    { key: "name", header: "المورد", cell: (r) => r.name, text: (r) => r.name },
    { key: "phone", header: "الهاتف", cell: (r) => r.phone, text: (r) => r.phone },
    { key: "count", header: "عدد الفواتير", align: "center", cell: (r) => supplierStats(data, r.id).count },
    { key: "purchases", header: "إجمالي المشتريات", cell: (r) => money(supplierStats(data, r.id).purchases) },
    {
      key: "debt",
      header: "المستحق",
      cell: (r) => {
        const debt = supplierStats(data, r.id).debt;
        return <span className={debt > 0 ? "font-semibold text-destructive" : ""}>{money(debt)}</span>;
      },
    },
  ];

  const recent = [...data.purchaseInvoices].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  return (
    <div className="space-y-4">
      <PageHeader
        title="لوحة المشتريات والموردين"
        description="مؤشرات ورسومات تحليلية للمشتريات والسداد وأسعار التوريد"
        actions={
          <>
            <Button asChild className="gap-1.5">
              <Link to="/purchases/invoices/new">
                <Plus className="size-4" />
                فاتورة مشتريات جديدة
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
        <KpiCard label="إجمالي المشتريات" value={money(kpis.purchases)} icon={<Truck className="size-4" />} spark={trend} />
        <KpiCard label="المسدد للموردين" value={money(kpis.paid)} tone="accent" icon={<Banknote className="size-4" />} />
        <KpiCard label="المتبقي على الفواتير" value={money(kpis.remaining)} tone="danger" />
        <KpiCard label="عدد الفواتير المُرحّلة" value={String(kpis.count)} icon={<Package className="size-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="اتجاه المشتريات — آخر 14 يوم" hint="بالجنيه المصري">
          <TrendLineChart data={trend} dataKey="value" name="المشتريات" />
        </ChartCard>
        <ChartCard title="أعلى الأصناف شراءً" hint="أعلى 6 أصناف">
          <GroupedBarChart data={topProducts} series={[{ key: "value", name: "قيمة الشراء" }]} vertical />
        </ChartCard>
        <ChartCard title="أعلى الموردين" hint="أعلى 6 موردين">
          <GroupedBarChart data={topSuppliers} series={[{ key: "value", name: "قيمة المشتريات" }]} vertical />
        </ChartCard>
        <div className="space-y-3">
          <StatCard label="إجمالي المستحق للموردين" value={money(kpis.debt)} tone="danger" />
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="border-b border-border pb-2 text-sm font-semibold text-primary">أصناف تحتاج إعادة شراء</h3>
            {low.length === 0 ? (
              <p className="pt-3 text-xs text-muted-foreground">لا توجد أصناف تحت الحد الأدنى</p>
            ) : (
              <ul className="space-y-1 pt-2 text-xs">
                {low.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between border-b border-border/50 py-1 last:border-0">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-destructive">
                      {num(p.stock)} / {num(p.minStock)} {UNIT_LABEL[p.unit]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <DataTable
        title="آخر فواتير الشراء"
        data={recent}
        rowId={(r) => r.id}
        columns={[
          { key: "no", header: "رقم الفاتورة", cell: (r) => r.no, text: (r) => r.no },
          { key: "date", header: "التاريخ", cell: (r) => dateFmt(r.date), text: (r) => r.date },
          {
            key: "supplier",
            header: "المورد",
            cell: (r) => (r.supplierId ? data.suppliers.find((s) => s.id === r.supplierId)?.name ?? "-" : r.supplierName),
            text: (r) => r.supplierName,
          },
          { key: "total", header: "المستحق", cell: (r) => money(purchaseTotalsOf(data, r).total) },
          { key: "paid", header: "المسدد", cell: (r) => money(purchaseTotalsOf(data, r).paid) },
        ]}
      />

      <DataTable title="الموردون" data={data.suppliers} columns={supplierColumns} rowId={(r) => r.id} />
    </div>
  );
}

const PURCHASE_REPORTS = {
  product: { title: "المشتريات حسب الصنف", label: "الصنف", rows: purchasesByProduct },
  supplier: { title: "المشتريات حسب المورد", label: "المورد", rows: purchasesBySupplier },
} as const;

/** تقرير تحليلى للمشتريات المُرحّلة */
export function PurchaseReport({ kind }: { kind: keyof typeof PURCHASE_REPORTS }) {
  const data = useDb();
  const config = PURCHASE_REPORTS[kind];
  const rows = config.rows(data);
  const total = rows.reduce((sum, r) => sum + r.total, 0);

  const columns: Array<Column<SalesByKeyRow>> = [
    { key: "label", header: config.label, cell: (r) => r.label, text: (r) => r.label },
    { key: "count", header: "عدد الحركات", cell: (r) => r.count, align: "center" },
    { key: "qty", header: "الكمية", cell: (r) => num(r.qty), align: "center" },
    { key: "total", header: "إجمالي الشراء", cell: (r) => money(r.total), text: (r) => String(r.total) },
    {
      key: "share",
      header: "النسبة",
      align: "center",
      cell: (r) => `${total > 0 ? ((r.total / total) * 100).toFixed(1) : "0.0"}%`,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={config.title} description="تقرير تحليلي لفواتير الشراء المُرحّلة بالجنيه المصري" />
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="إجمالي المشتريات" value={money(total)} />
        <StatCard label="عدد السطور" value={String(rows.length)} tone="muted" />
      </div>
      <DataTable title={config.title} data={rows} columns={columns} rowId={(r) => r.key} />
    </div>
  );
}
