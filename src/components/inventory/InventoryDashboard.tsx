import { Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Plus,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { useEffect } from "react";

import { ChartCard, GroupedBarChart, TrendLineChart } from "@/components/analytics/ChartCard";
import { KpiCard } from "@/components/analytics/KpiCard";
import { PeriodFilter, periodText, usePeriodDb } from "@/components/analytics/PeriodFilter";
import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatusBadge } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { dateFmt, money, num } from "@/lib/format";
import {
  inventoryKpis,
  moveQty,
  moveTrendSeries,
  moveValue,
  warehouseBalance,
  warehouseName,
} from "@/lib/inventory";
import { backfillInvoiceMoves } from "@/lib/inventoryActions";
import { MOVE_KIND_LABEL, MOVE_SOURCE_LABEL, useDb, type StockMove, type Warehouse } from "@/lib/mockDb";

export function InventoryDashboard() {
  const rawDb = useDb();
  const { range, setRange, scoped: data } = usePeriodDb(rawDb, "period:inventory");

  useEffect(() => {
    backfillInvoiceMoves();
  }, []);

  const kpis = inventoryKpis(data);
  const trend = moveTrendSeries(data, 14).map((r) => ({ label: r.label, in: r.in, out: r.out, value: r.in }));

  const perWarehouse = data.warehouses.map((w) => {
    const rows = warehouseBalance(data, w.id);
    return {
      label: w.name,
      value: Math.round(rows.reduce((s, r) => s + r.value, 0)),
    };
  });

  const recent = [...data.stockMoves]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 8);

  const moveColumns: Array<Column<StockMove>> = [
    { key: "no", header: "رقم الإذن", cell: (r) => r.no, text: (r) => r.no },
    { key: "date", header: "التاريخ", cell: (r) => dateFmt(r.date), text: (r) => r.date },
    {
      key: "kind",
      header: "النوع",
      align: "center",
      cell: (r) => (
        <StatusBadge label={MOVE_KIND_LABEL[r.kind]} tone={r.kind === "in" ? "green" : r.kind === "out" ? "red" : "gold"} />
      ),
      text: (r) => MOVE_KIND_LABEL[r.kind],
    },
    { key: "ref", header: "الرقم المرجعى", cell: (r) => r.refNo || "-", text: (r) => r.refNo },
    { key: "source", header: "المصدر", cell: (r) => MOVE_SOURCE_LABEL[r.source], text: (r) => MOVE_SOURCE_LABEL[r.source] },
    { key: "wh", header: "المخزن", cell: (r) => warehouseName(data, r.warehouseId), text: (r) => warehouseName(data, r.warehouseId) },
    { key: "qty", header: "الكمية", cell: (r) => num(moveQty(r)) },
    { key: "value", header: "القيمة", cell: (r) => money(moveValue(r)) },
  ];

  const whColumns: Array<Column<Warehouse>> = [
    { key: "code", header: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "المخزن", cell: (r) => r.name, text: (r) => r.name },
    {
      key: "type",
      header: "النوع",
      align: "center",
      cell: (r) => ((r.type ?? "main") === "main" ? "رئيسي" : "فرعي"),
      text: (r) => ((r.type ?? "main") === "main" ? "رئيسي" : "فرعي"),
    },
    { key: "items", header: "عدد الأصناف", align: "center", cell: (r) => warehouseBalance(data, r.id).length },
    {
      key: "value",
      header: "قيمة المخزون",
      cell: (r) => money(warehouseBalance(data, r.id).reduce((s, x) => s + x.value, 0)),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="لوحة المخازن والمخزون"
        description="مؤشرات المخزون والأذون التلقائية المتولدة من فواتير المشتريات والمبيعات"
        actions={
          <>
            <Button asChild className="gap-1.5">
              <Link to="/inventory/moves/new">
                <Plus className="size-4" />
                إذن مخزني جديد
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1.5">
              <Link to="/inventory/warehouses">
                <WarehouseIcon className="size-4" />
                تكويد المخازن
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
        <PeriodFilter value={range} onChange={setRange} />
        <span className="text-xs font-semibold text-muted-foreground">{periodText(range)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="عدد المخازن النشطة" value={num(kpis.warehouses)} icon={<WarehouseIcon className="size-4" />} />
        <KpiCard label="قيمة المخزون الحالية" value={money(kpis.totalValue)} tone="accent" icon={<Package className="size-4" />} />
        <KpiCard
          label="أذون الإضافة (مشتريات)"
          value={num(kpis.inMoves)}
          spark={trend}
          sparkKey="in"
          icon={<ArrowDownToLine className="size-4" />}
        />
        <KpiCard
          label="أذون الصرف (مبيعات)"
          value={num(kpis.outMoves)}
          tone="danger"
          spark={trend}
          sparkKey="out"
          icon={<ArrowUpFromLine className="size-4" />}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="حركة الإضافة والصرف — آخر 14 يوم" hint="الكميات بالوحدة الأساسية">
          <GroupedBarChart
            data={trend}
            series={[
              { key: "in", name: "إضافة" },
              { key: "out", name: "صرف" },
            ]}
          />
        </ChartCard>
        <ChartCard title="قيمة المخزون حسب المخزن">
          <GroupedBarChart data={perWarehouse} series={[{ key: "value", name: "القيمة" }]} vertical />
        </ChartCard>
      </div>

      <ChartCard title="اتجاه أذون الإضافة" hint="إجمالي الكميات المضافة يومياً">
        <TrendLineChart data={trend} dataKey="in" name="إضافة مخزون" />
      </ChartCard>

      <DataTable data={data.warehouses} columns={whColumns} rowId={(r) => r.id} title="المخازن وأرصدتها" />

      <DataTable data={recent} columns={moveColumns} rowId={(r) => r.id} title="أحدث الأذون المخزنية" />
    </div>
  );
}
