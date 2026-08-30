import { today } from "@/lib/format";
import { linesFromInvoice } from "@/lib/inventory";
import { nextMoveNo, invoiceRefNo } from "@/lib/inventoryActions";
import {
  isDuplicate,
  mutate,
  nextNo,
  uid,
  type DbShape,
  type DocStatus,
  type ReturnDoc,
  type StockMove,
} from "@/lib/mockDb";
import { returnTotals, returnableQty } from "@/lib/returns";
import type { ActionResult } from "@/lib/salesActions";
import { baseQty } from "@/lib/units";

/* ===================== أرقام ومعرّفات مرتبطة ===================== */

export function nextReturnNo(data: DbShape, kind: ReturnDoc["kind"]): string {
  const prefix = kind === "sales" ? "SRT" : "PRT";
  return nextNo(
    prefix,
    data.returns.filter((r) => r.no.startsWith(prefix)).map((r) => r.no),
  );
}

function returnMoveId(id: string) {
  return `mv_rtn_${id}`;
}

function returnVoucherId(id: string) {
  return `auto_rtn_${id}`;
}

/* ===================== أثر المرتجع ===================== */

/** المرتجع البيعى يرجع البضاعة للمخزن، ومرتجع الشراء يخرجها منه */
function applyReturnStock(data: DbShape, doc: ReturnDoc, direction: 1 | -1) {
  const sign = doc.kind === "sales" ? 1 : -1;
  for (const line of doc.lines) {
    const product = data.products.find((p) => p.id === line.productId);
    if (product) product.stock += baseQty(line) * sign * direction;
  }
}

function syncReturnMove(data: DbShape, doc: ReturnDoc): StockMove {
  const kind = doc.kind === "sales" ? "return_in" : "return_out";
  const source = doc.kind === "sales" ? "sales_return" : "purchase_return";
  const id = returnMoveId(doc.id);
  const existing = data.stockMoves.find((m) => m.id === id);

  const record: StockMove = {
    id,
    no: existing?.no ?? nextMoveNo(data, kind),
    date: doc.date,
    kind,
    source,
    warehouseId: doc.warehouseId,
    toWarehouseId: null,
    refNo: invoiceRefNo(source, doc.no),
    refCode: doc.refInvoiceNo || doc.no,
    refId: doc.id,
    partyName: doc.partyName,
    branchId: doc.branchId,
    userId: doc.userId,
    lines: linesFromInvoice(data, doc.lines),
    note:
      doc.kind === "sales"
        ? `إذن مرتجع وارد تلقائى من مرتجع المبيعات ${doc.no}`
        : `إذن مرتجع صادر تلقائى من مرتجع المشتريات ${doc.no}`,
    status: "posted",
  };

  if (existing) data.stockMoves = data.stockMoves.map((m) => (m.id === id ? record : m));
  else data.stockMoves.push(record);
  return record;
}

function unpostReturn(data: DbShape, doc: ReturnDoc) {
  applyReturnStock(data, doc, -1);
  data.stockMoves = data.stockMoves.filter((m) => m.id !== returnMoveId(doc.id));
  data.vouchers = data.vouchers.filter((v) => v.id !== returnVoucherId(doc.id));
}

function postReturn(data: DbShape, doc: ReturnDoc) {
  applyReturnStock(data, doc, 1);
  syncReturnMove(data, doc);

  // الرد النقدى: مرتجع بيع = صرف من الخزينة للعميل، مرتجع شراء = قبض من المورد
  const total = returnTotals(doc.lines).total;
  if (doc.settle === "cash" && doc.safeId && total > 0.01) {
    const kind = doc.kind === "sales" ? "payment" : "receipt";
    data.vouchers.push({
      id: returnVoucherId(doc.id),
      kind,
      no: nextNo(kind === "payment" ? "PV" : "RV", data.vouchers.map((v) => v.no)),
      date: doc.date,
      safeId: doc.safeId,
      branchId: doc.branchId,
      userId: doc.userId,
      partyType: doc.partyId ? (doc.kind === "sales" ? "customer" : "supplier") : "other",
      partyId: doc.partyId,
      categoryId: null,
      costCenter: doc.kind === "sales" ? "المبيعات" : "المشتريات",
      method: "cash",
      reference: doc.no,
      amount: total,
      note:
        doc.kind === "sales"
          ? `رد نقدى عن مرتجع مبيعات ${doc.no}`
          : `تحصيل نقدى عن مرتجع مشتريات ${doc.no}`,
      status: "posted",
      allocations: [],
      reconciled: false,
      shiftId: null,
      auto: true,
    });
  }
}

/* ===================== حفظ المرتجع ===================== */

export function saveReturn(
  input: Omit<ReturnDoc, "id" | "no"> & { id?: string; no?: string },
): ActionResult {
  let result: ActionResult = { ok: true };

  mutate((data) => {
    const lines = (input.lines ?? []).filter((l) => l.productId && Number(l.qty) > 0);
    if (lines.length === 0) {
      result = { ok: false, error: "يجب إضافة صنف واحد على الأقل بكمية صحيحة" };
      return;
    }
    if (!input.warehouseId) {
      result = { ok: false, error: "يجب اختيار المخزن" };
      return;
    }
    if (input.settle === "cash" && !input.safeId) {
      result = { ok: false, error: "الرد النقدى يتطلب اختيار الخزينة" };
      return;
    }
    if (input.settle === "credit" && !input.partyId) {
      result = { ok: false, error: "الإشعار على الحساب يتطلب اختيار جهة مسجلة" };
      return;
    }

    const existing = input.id ? data.returns.find((r) => r.id === input.id) : undefined;
    if (existing && existing.status === "posted") unpostReturn(data, existing);

    // لا يمكن إرجاع أكثر من الكمية المفوترة
    if (input.refInvoiceId) {
      for (const line of lines) {
        const allowed = returnableQty(data, input.kind, input.refInvoiceId, line.productId, existing?.id);
        if (baseQty(line) > allowed + 0.0001) {
          result = {
            ok: false,
            error: `الكمية المرتجعة من ${line.name} أكبر من المتبقى بالفاتورة (${allowed})`,
          };
          if (existing && existing.status === "posted") postReturn(data, existing);
          return;
        }
      }
    }

    // مرتجع المشتريات يخرج بضاعة — نتحقق من كفاية الرصيد
    if (input.status === "posted" && input.kind === "purchase" && !data.settings.allowNegativeStock) {
      for (const line of lines) {
        const product = data.products.find((p) => p.id === line.productId);
        if (product && baseQty(line) > product.stock + 0.0001) {
          result = {
            ok: false,
            error: `رصيد ${product.name} (${product.stock}) لا يكفى لإرجاعه للمورد`,
          };
          if (existing && existing.status === "posted") postReturn(data, existing);
          return;
        }
      }
    }

    const partyName = input.partyId
      ? (input.kind === "sales" ? data.customers : data.suppliers).find((p) => p.id === input.partyId)?.name ??
        input.partyName
      : input.partyName?.trim() || (input.kind === "sales" ? "عميل نقدي" : "مورد نقدي");

    const record: ReturnDoc = {
      id: existing?.id ?? uid("rtn"),
      no: existing?.no ?? input.no ?? nextReturnNo(data, input.kind),
      kind: input.kind,
      date: input.date || today(),
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      userId: input.userId,
      partyId: input.partyId ?? null,
      partyName,
      refInvoiceId: input.refInvoiceId ?? null,
      refInvoiceNo: input.refInvoiceNo ?? "",
      lines,
      settle: input.settle,
      safeId: input.settle === "cash" ? input.safeId : null,
      reason: input.reason?.trim() ?? "",
      note: input.note?.trim() ?? "",
      status: input.status,
    };

    if (isDuplicate(data.returns, "no", record.no, record.id)) {
      result = { ok: false, error: "رقم المرتجع مكرر" };
      return;
    }

    if (existing) data.returns = data.returns.map((r) => (r.id === record.id ? record : r));
    else data.returns.push(record);

    if (record.status === "posted") postReturn(data, record);
    result = { ok: true, id: record.id };
  });

  return result;
}

export function setReturnStatus(id: string, status: DocStatus): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const doc = data.returns.find((r) => r.id === id);
    if (!doc) {
      result = { ok: false, error: "المرتجع غير موجود" };
      return;
    }
    if (doc.status === status) return;
    if (doc.status === "posted") unpostReturn(data, doc);
    doc.status = status;
    if (status === "posted") {
      if (doc.kind === "purchase" && !data.settings.allowNegativeStock) {
        for (const line of doc.lines) {
          const product = data.products.find((p) => p.id === line.productId);
          if (product && baseQty(line) > product.stock + 0.0001) {
            result = { ok: false, error: `رصيد ${product.name} لا يكفى لإرجاعه للمورد` };
            doc.status = "draft";
            return;
          }
        }
      }
      postReturn(data, doc);
    }
  });
  return result;
}

export function deleteReturn(id: string): ActionResult {
  const result: ActionResult = { ok: true };
  mutate((data) => {
    const doc = data.returns.find((r) => r.id === id);
    if (!doc) return;
    if (doc.status === "posted") unpostReturn(data, doc);
    data.returns = data.returns.filter((r) => r.id !== id);
  });
  return result;
}
