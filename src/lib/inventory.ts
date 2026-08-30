import {
  MOVE_KIND_LABEL,
  UNIT_LABEL,
  type DbShape,
  type SalesLine,
  type StockMove,
  type StockMoveKind,
  type StockMoveLine,
  type Warehouse,
} from "@/lib/mockDb";
import { baseQty } from "@/lib/units";

/* ===================== أدوات المخازن ===================== */

export function warehouseName(data: DbShape, id?: string | null): string {
  if (!id) return "-";
  return data.warehouses.find((w) => w.id === id)?.name ?? "-";
}

export function warehouseLabel(data: DbShape, w: Warehouse): string {
  const parent = w.parentId ? data.warehouses.find((p) => p.id === w.parentId)?.name : "";
  return parent ? `${w.name} (تابع لـ ${parent})` : w.name;
}

export function warehouseOptions(data: DbShape, onlyActive = true) {
  return data.warehouses
    .filter((w) => (onlyActive ? w.active !== false : true))
    .map((w) => ({
      value: w.id,
      label: w.name,
      hint: `${w.code} — ${w.type === "sub" ? "فرعي" : "رئيسي"}`,
    }));
}

/** المخازن الفرعية التابعة لمخزن رئيسي */
export function childWarehouses(data: DbShape, id: string): Warehouse[] {
  return data.warehouses.filter((w) => w.parentId === id);
}

/* ===================== أدوات الأذون ===================== */

/** الكمية بالوحدة الأساسية لسطر الإذن */
export function moveLineBaseQty(line: Pick<StockMoveLine, "qty" | "unitFactor">): number {
  return baseQty(line as Pick<SalesLine, "qty" | "unitFactor">);
}

/** إجمالي كمية الإذن بالوحدة الأساسية */
export function moveQty(move: StockMove): number {
  return move.lines.reduce((sum, l) => sum + moveLineBaseQty(l), 0);
}

/** القيمة التقديرية للإذن بالتكلفة */
export function moveValue(move: StockMove): number {
  return move.lines.reduce((sum, l) => sum + moveLineBaseQty(l) * Number(l.cost || 0), 0);
}

export function moveKindLabel(kind: StockMoveKind): string {
  return MOVE_KIND_LABEL[kind];
}

/** إشارة أثر الإذن على المخزون */
export function moveSign(kind: StockMoveKind): number {
  if (kind === "in") return 1;
  if (kind === "out") return -1;
  return 0;
}

/** تحويل أسطر فاتورة إلى أسطر إذن مخزني */
export function linesFromInvoice(data: DbShape, lines: SalesLine[]): StockMoveLine[] {
  return lines.map((l) => {
    const product = data.products.find((p) => p.id === l.productId);
    return {
      id: `ml_${l.id}`,
      productId: l.productId,
      code: l.code || product?.code || "",
      name: l.name || product?.name || "",
      qty: Number(l.qty || 0),
      unit: l.unit ?? product?.unit ?? "ton",
      unitCode: l.unitCode,
      unitName: l.unitName,
      unitFactor: l.unitFactor,
      cost: Number(product?.cost || 0),
    };
  });
}

export function moveLineUnitLabel(line: StockMoveLine): string {
  return line.unitName?.trim() || UNIT_LABEL[line.unit] || String(line.unit);
}

/* ===================== الأرصدة ===================== */

export interface WarehouseBalanceRow {
  productId: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  cost: number;
  value: number;
  minStock: number;
}

/** رصيد الأصناف داخل مخزن معين (أو كل المخازن) محسوباً من الأذون المُرحّلة */
export function warehouseBalance(data: DbShape, warehouseId?: string | null): WarehouseBalanceRow[] {
  const qtyMap = new Map<string, number>();
  const add = (productId: string, qty: number) => {
    qtyMap.set(productId, (qtyMap.get(productId) ?? 0) + qty);
  };

  for (const move of data.stockMoves) {
    if (move.status !== "posted") continue;
    for (const line of move.lines) {
      const q = moveLineBaseQty(line);
      if (move.kind === "transfer") {
        if (!warehouseId || move.warehouseId === warehouseId) add(line.productId, -q);
        if (!warehouseId || move.toWarehouseId === warehouseId) add(line.productId, q);
        continue;
      }
      if (warehouseId && move.warehouseId !== warehouseId) continue;
      add(line.productId, move.kind === "out" ? -q : q);
    }
  }

  const rows: WarehouseBalanceRow[] = [];
  for (const product of data.products) {
    const qty = warehouseId ? qtyMap.get(product.id) ?? 0 : Number(product.stock || 0);
    if (warehouseId && Math.abs(qty) < 0.0001) continue;
    rows.push({
      productId: product.id,
      code: product.code,
      name: product.name,
      unit: UNIT_LABEL[product.unit],
      qty,
      cost: Number(product.cost || 0),
      value: qty * Number(product.cost || 0),
      minStock: Number(product.minStock || 0),
    });
  }
  return rows.sort((a, b) => b.value - a.value);
}

/** رصيد صنف واحد فى مخزن */
export function productWarehouseQty(data: DbShape, productId: string, warehouseId: string): number {
  return warehouseBalance(data, warehouseId).find((r) => r.productId === productId)?.qty ?? 0;
}

export interface InventoryKpis {
  warehouses: number;
  products: number;
  totalQty: number;
  totalValue: number;
  inMoves: number;
  outMoves: number;
  lowStock: number;
}

export function inventoryKpis(data: DbShape): InventoryKpis {
  const rows = warehouseBalance(data, null);
  const posted = data.stockMoves.filter((m) => m.status === "posted");
  return {
    warehouses: data.warehouses.filter((w) => w.active !== false).length,
    products: data.products.length,
    totalQty: rows.reduce((s, r) => s + r.qty, 0),
    totalValue: rows.reduce((s, r) => s + r.value, 0),
    inMoves: posted.filter((m) => m.kind === "in").length,
    outMoves: posted.filter((m) => m.kind === "out").length,
    lowStock: data.products.filter((p) => Number(p.stock || 0) <= Number(p.minStock || 0)).length,
  };
}

/** حركة الإضافة والصرف يومياً للرسم البياني */
export function moveTrendSeries(data: DbShape, days = 14) {
  const out: Array<{ label: string; in: number; out: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const dayMoves = data.stockMoves.filter((m) => m.status === "posted" && m.date === key);
    out.push({
      label: key.slice(5),
      in: Math.round(dayMoves.filter((m) => m.kind === "in").reduce((s, m) => s + moveQty(m), 0)),
      out: Math.round(dayMoves.filter((m) => m.kind === "out").reduce((s, m) => s + moveQty(m), 0)),
    });
  }
  return out;
}

export function emptyMoveLine(id: string): StockMoveLine {
  return { id, productId: "", code: "", name: "", qty: 1, unit: "ton", cost: 0 };
}
