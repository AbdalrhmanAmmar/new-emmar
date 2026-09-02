import { Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, num } from "@/lib/format";
import { moveQty, moveValue, warehouseName, warehouseOptions } from "@/lib/inventory";
import { printStockMove } from "@/lib/printMove";
import { useDb, type StockMove } from "@/lib/mockDb";

/** أذون التسوية المتولدة من الجرد */
function isStocktakeMove(m: StockMove): boolean {
  return m.refCode === "جرد فعلى" || m.refNo.startsWith("STK-");
}

export function StocktakeReportPage() {
  const data = useDb();
  const [warehouseId, setWarehouseId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(
    () =>
      data.stockMoves
        .filter(isStocktakeMove)
        .filter((m) => (warehouseId ? m.warehouseId === warehouseId : true))
        .filter((m) => (from ? m.date >= from : true))
        .filter((m) => (to ? m.date <= to : true))
        .sort((a, b) => (a.date === b.date ? b.no.localeCompare(a.no) : b.date.localeCompare(a.date))),
    [data.stockMoves, warehouseId, from, to],
  );

  const surplus = rows.filter((m) => m.kind === "in").reduce((s, m) => s + moveQty(m), 0);
  const shortage = rows.filter((m) => m.kind === "out").reduce((s, m) => s + moveQty(m), 0);
  const netValue = rows.reduce((s, m) => s + (m.kind === "in" ? 1 : -1) * moveValue(m), 0);
  const sessions = new Set(rows.map((m) => `${m.date}|${m.warehouseId}`)).size;

  const columns: Array<Column<StockMove>> = [
    { key: "no", header: "رقم الإذن", cell: (m) => m.no, text: (m) => m.no },
    { key: "date", header: "تاريخ الجرد", align: "center", cell: (m) => m.date, text: (m) => m.date },
    {
      key: "wh",
      header: "المخزن",
      cell: (m) => warehouseName(data, m.warehouseId),
      text: (m) => warehouseName(data, m.warehouseId),
    },
    {
      key: "kind",
      header: "نوع الفرق",
      align: "center",
      cell: (m) => <StatusBadge label={m.kind === "in" ? "زيادة جرد" : "نقص جرد"} tone={m.kind === "in" ? "gold" : "red"} />,
      text: (m) => (m.kind === "in" ? "زيادة جرد" : "نقص جرد"),
    },
    { key: "items", header: "عدد الأصناف", align: "center", cell: (m) => num(m.lines.length) },
    { key: "qty", header: "إجمالى الكمية", cell: (m) => num(moveQty(m)) },
    { key: "value", header: "قيمة الفرق", cell: (m) => money(moveValue(m)) },
    {
      key: "details",
      header: "تفاصيل الأصناف",
      cell: (m) => (
        <span className="text-xs text-muted-foreground">
          {m.lines.map((l) => `${l.name} (${num(l.qty)})`).join(" — ")}
        </span>
      ),
      text: (m) => m.lines.map((l) => `${l.code} ${l.name}`).join(" "),
    },
    { key: "note", header: "ملاحظات", cell: (m) => m.note || "-", text: (m) => m.note },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="تقرير الجرد"
        description="كل عمليات الجرد السابقة وفروقها (زيادة/نقص) وقيمتها لكل مخزن"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد عمليات الجرد" value={num(sessions)} />
        <StatCard label="إجمالى الزيادة" value={num(surplus)} tone="accent" />
        <StatCard label="إجمالى النقص" value={num(shortage)} tone="danger" />
        <StatCard label="صافى قيمة الفروق" value={money(netValue)} />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowId={(m) => m.id}
        title="أذون تسوية الجرد"
        searchPlaceholder="ابحث برقم الإذن أو الصنف أو المخزن..."
        emptyText="لا توجد عمليات جرد مسجلة بعد"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-52">
              <SearchSelect
                options={[{ value: "", label: "كل المخازن" }, ...warehouseOptions(data, false)]}
                value={warehouseId}
                onChange={(v) => setWarehouseId(v ?? "")}
                placeholder="كل المخازن"
              />
            </div>
            <Input type="date" dir="ltr" className="w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" dir="ltr" className="w-36" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        }
        actions={(m) => (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => printStockMove(data, m)}>
            <Printer className="size-4" />
            طباعة
          </Button>
        )}
      />
    </div>
  );
}
