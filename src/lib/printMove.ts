import { dateFmt, money, num } from "@/lib/format";
import { moveLineUnitLabel, moveLineBaseQty, moveValue, warehouseName } from "@/lib/inventory";
import { printRecord } from "@/lib/printDoc";
import {
  MOVE_KIND_LABEL,
  MOVE_SOURCE_LABEL,
  STATUS_LABEL,
  type DbShape,
  type StockMove,
} from "@/lib/mockDb";

/** طباعة إذن مخزني (إضافة / صرف / تحويل / تسوية) على A4 */
export function printStockMove(data: DbShape, move: StockMove) {
  const title = `${MOVE_KIND_LABEL[move.kind]} رقم ${move.no}`;
  const fields: Array<[string, string]> = [
    ["رقم الإذن", move.no],
    ["التاريخ", dateFmt(move.date)],
    ["نوع الإذن", MOVE_KIND_LABEL[move.kind]],
    ["المصدر", MOVE_SOURCE_LABEL[move.source]],
    ["الرقم المرجعى", move.refNo || "-"],
    ["كود / رقم الفاتورة", move.refCode || "-"],
    [move.kind === "transfer" ? "من مخزن" : "المخزن", warehouseName(data, move.warehouseId)],
    ["إلى مخزن", move.toWarehouseId ? warehouseName(data, move.toWarehouseId) : "-"],
    ["الجهة", move.partyName || "-"],
    ["الفرع", data.branches.find((b) => b.id === move.branchId)?.name ?? "-"],
    ["المستخدم", data.users.find((u) => u.id === move.userId)?.name ?? "-"],
    ["الحالة", STATUS_LABEL[move.status]],
  ];

  const rows = move.lines.map((line, index) => [
    String(index + 1),
    line.code,
    line.name,
    num(line.qty),
    moveLineUnitLabel(line),
    num(moveLineBaseQty(line)),
    money(line.cost),
    money(moveLineBaseQty(line) * Number(line.cost || 0)),
  ]);

  printRecord(
    title,
    fields,
    {
      headers: ["م", "الكود", "الصنف", "الكمية", "الوحدة", "الكمية الأساسية", "التكلفة", "القيمة"],
      rows,
    },
    `إجمالي قيمة الإذن: ${money(moveValue(move))}${move.note ? ` — ملاحظات: ${move.note}` : ""}`,
  );
}
