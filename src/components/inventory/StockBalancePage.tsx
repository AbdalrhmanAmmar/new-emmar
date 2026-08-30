import { useEffect, useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { money, num } from "@/lib/format";
import { warehouseBalance, warehouseOptions, type WarehouseBalanceRow } from "@/lib/inventory";
import { backfillInvoiceMoves } from "@/lib/inventoryActions";
import { useDb } from "@/lib/mockDb";

export function StockBalancePage() {
  const data = useDb();
  const [warehouseId, setWarehouseId] = useState("");

  useEffect(() => {
    backfillInvoiceMoves();
  }, []);

  const rows = warehouseBalance(data, warehouseId || null);

  const columns: Array<Column<WarehouseBalanceRow>> = [
    { key: "code", header: "كود الصنف", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "الصنف", cell: (r) => r.name, text: (r) => r.name },
    { key: "unit", header: "الوحدة", align: "center", cell: (r) => r.unit, text: (r) => r.unit },
    { key: "qty", header: "الرصيد", cell: (r) => num(r.qty), text: (r) => String(r.qty) },
    { key: "min", header: "حد الطلب", cell: (r) => num(r.minStock) },
    { key: "cost", header: "متوسط التكلفة", cell: (r) => money(r.cost) },
    { key: "value", header: "قيمة الرصيد", cell: (r) => money(r.value) },
    {
      key: "state",
      header: "الحالة",
      align: "center",
      cell: (r) => (
        <StatusBadge
          label={r.qty <= 0 ? "بدون رصيد" : r.qty <= r.minStock ? "تحت حد الطلب" : "متاح"}
          tone={r.qty <= 0 ? "gray" : r.qty <= r.minStock ? "red" : "green"}
        />
      ),
      text: (r) => (r.qty <= r.minStock ? "تحت حد الطلب" : "متاح"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="أرصدة المخازن وتقييم المخزون"
        description="الرصيد محسوب من أذون الإضافة والصرف والتحويل لكل مخزن"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد الأصناف" value={num(rows.length)} />
        <StatCard label="إجمالي الرصيد" value={num(rows.reduce((s, r) => s + r.qty, 0))} tone="accent" />
        <StatCard label="قيمة المخزون" value={money(rows.reduce((s, r) => s + r.value, 0))} />
        <StatCard
          label="أصناف تحت حد الطلب"
          value={num(rows.filter((r) => r.qty <= r.minStock).length)}
          tone="danger"
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowId={(r) => r.productId}
        title={warehouseId ? `رصيد ${data.warehouses.find((w) => w.id === warehouseId)?.name ?? ""}` : "رصيد كل المخازن"}
        searchPlaceholder="ابحث بكود أو اسم الصنف..."
        toolbar={
          <div className="w-64">
            <SearchSelect
              options={[{ value: "", label: "كل المخازن" }, ...warehouseOptions(data, false)]}
              value={warehouseId}
              onChange={(v) => setWarehouseId(v ?? "")}
              placeholder="كل المخازن"
            />
          </div>
        }
      />
    </div>
  );
}
