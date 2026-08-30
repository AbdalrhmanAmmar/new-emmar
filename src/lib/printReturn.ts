import { dateFmt, money, num } from "@/lib/format";
import { warehouseName } from "@/lib/inventory";
import {
  RETURN_KIND_LABEL,
  RETURN_SETTLE_LABEL,
  STATUS_LABEL,
  UNIT_LABEL,
  type DbShape,
  type ReturnDoc,
} from "@/lib/mockDb";
import { printRecord } from "@/lib/printDoc";
import { lineTotals } from "@/lib/sales";
import { returnTotals } from "@/lib/returns";

/** طباعة مستند مرتجع (مبيعات / مشتريات) على A4 */
export function printReturn(data: DbShape, doc: ReturnDoc) {
  const title = `${RETURN_KIND_LABEL[doc.kind]} رقم ${doc.no}`;
  const t = returnTotals(doc.lines);

  const fields: Array<[string, string]> = [
    ["رقم المرتجع", doc.no],
    ["التاريخ", dateFmt(doc.date)],
    ["نوع المرتجع", RETURN_KIND_LABEL[doc.kind]],
    [doc.kind === "sales" ? "العميل" : "المورد", doc.partyName || "-"],
    ["الفاتورة الأصلية", doc.refInvoiceNo || "-"],
    ["المخزن", warehouseName(data, doc.warehouseId)],
    ["التسوية", RETURN_SETTLE_LABEL[doc.settle]],
    ["الخزينة", doc.safeId ? data.safes.find((s) => s.id === doc.safeId)?.name ?? "-" : "-"],
    ["سبب الإرجاع", doc.reason || "-"],
    ["الحالة", STATUS_LABEL[doc.status]],
  ];

  const rows = doc.lines.map((line, i) => {
    const lt = lineTotals(line);
    return [
      String(i + 1),
      line.code,
      line.name,
      num(line.qty),
      line.unitName?.trim() || UNIT_LABEL[line.unit] || String(line.unit),
      money(line.price),
      money(lt.discount),
      money(lt.tax),
      money(lt.total),
    ];
  });

  printRecord(
    title,
    fields,
    {
      headers: ["#", "الكود", "الصنف", "الكمية", "الوحدة", "السعر", "الخصم", "الضريبة", "الإجمالي"],
      rows,
    },
    `الصافي: ${money(t.net)} — الضريبة: ${money(t.tax)} — إجمالي المرتجع: ${money(t.total)}`,
  );
}
