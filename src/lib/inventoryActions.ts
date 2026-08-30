import { today } from "./format";
import { linesFromInvoice, moveLineBaseQty, moveSign } from "./inventory";
import {
  isDuplicate,
  mutate,
  nextCode,
  nextNo,
  uid,
  type DbShape,
  type DocStatus,
  type SalesLine,
  type StockMove,
  type StockMoveKind,
  type StockMoveSource,
  type Warehouse,
} from "./mockDb";
import type { ActionResult } from "./salesActions";

/* ===================== ترقيم الأذون ===================== */

const KIND_PREFIX: Record<StockMoveKind, string> = {
  in: "GRN",
  out: "ISS",
  transfer: "TRF",
  adjust: "ADJ",
  return_in: "RTI",
  return_out: "RTO",
};

export function nextMoveNo(data: DbShape, kind: StockMoveKind): string {
  const prefix = KIND_PREFIX[kind];
  return nextNo(
    prefix,
    data.stockMoves.filter((m) => m.no.startsWith(prefix)).map((m) => m.no),
  );
}

/** الرقم المرجعى المركّب: كود المستند + رقم الفاتورة */
export function invoiceRefNo(source: StockMoveSource, invoiceNo: string): string {
  const code =
    source === "purchase" ? "PINV" : source === "sales_return" ? "SRTN" : source === "purchase_return" ? "PRTN" : "SINV";
  return `${code}-${invoiceNo}`;
}

/* ===================== الأذون التلقائية من الفواتير ===================== */

export function autoMoveId(invoiceId: string): string {
  return `mv_${invoiceId}`;
}

interface AutoMoveInput {
  invoiceId: string;
  invoiceNo: string;
  source: StockMoveSource;
  date: string;
  warehouseId: string;
  branchId: string;
  userId: string;
  partyName: string;
  lines: SalesLine[];
  note?: string;
}

/**
 * إنشاء أو تحديث الإذن المخزني التلقائى المرتبط بفاتورة:
 * المشتريات → إذن إضافة مخزون، المبيعات → إذن صرف مخزني.
 */
export function syncInvoiceMove(data: DbShape, input: AutoMoveInput): StockMove {
  const kind: StockMoveKind = input.source === "purchase" ? "in" : "out";
  const id = autoMoveId(input.invoiceId);
  const existing = data.stockMoves.find((m) => m.id === id);

  const record: StockMove = {
    id,
    no: existing?.no ?? nextMoveNo(data, kind),
    date: input.date || today(),
    kind,
    source: input.source,
    warehouseId: input.warehouseId,
    toWarehouseId: null,
    refNo: invoiceRefNo(input.source, input.invoiceNo),
    refCode: input.invoiceNo,
    refId: input.invoiceId,
    partyName: input.partyName,
    branchId: input.branchId,
    userId: input.userId,
    lines: linesFromInvoice(data, input.lines),
    note: input.note ?? (input.source === "purchase" ? "إذن استلام تلقائى من فاتورة المشتريات" : "إذن صرف تلقائى من فاتورة المبيعات"),
    status: "posted",
  };

  if (existing) data.stockMoves = data.stockMoves.map((m) => (m.id === id ? record : m));
  else data.stockMoves.push(record);
  return record;
}

/** حذف الإذن التلقائى عند عكس أثر الفاتورة */
export function removeInvoiceMove(data: DbShape, invoiceId: string) {
  data.stockMoves = data.stockMoves.filter((m) => m.id !== autoMoveId(invoiceId));
}

/** توليد الأذون للفواتير المُرحّلة القديمة (يُنفّذ مرة واحدة بشكل آمن) */
export function backfillInvoiceMoves() {
  mutate((data) => {
    for (const inv of data.purchaseInvoices) {
      if (inv.status !== "posted") continue;
      if (data.stockMoves.some((m) => m.id === autoMoveId(inv.id))) continue;
      syncInvoiceMove(data, {
        invoiceId: inv.id,
        invoiceNo: inv.no,
        source: "purchase",
        date: inv.date,
        warehouseId: inv.warehouseId,
        branchId: inv.branchId,
        userId: inv.userId,
        partyName: inv.supplierName,
        lines: inv.lines,
      });
    }
    for (const inv of data.salesInvoices) {
      if (inv.status !== "posted") continue;
      if (data.stockMoves.some((m) => m.id === autoMoveId(inv.id))) continue;
      syncInvoiceMove(data, {
        invoiceId: inv.id,
        invoiceNo: inv.no,
        source: "sales",
        date: inv.date,
        warehouseId: inv.warehouseId,
        branchId: inv.branchId,
        userId: inv.userId,
        partyName: inv.customerName,
        lines: inv.lines,
      });
    }
  });
}

/* ===================== تكويد المخازن ===================== */

export function saveWarehouse(input: Omit<Warehouse, "id"> & { id?: string }): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (!input.name?.trim()) {
      result = { ok: false, error: "اسم المخزن مطلوب" };
      return;
    }
    const code = input.code?.trim() || nextCode("WH", data.warehouses.map((w) => w.code));
    if (isDuplicate(data.warehouses, "code", code, input.id)) {
      result = { ok: false, error: "كود المخزن مستخدم بالفعل" };
      return;
    }
    if (isDuplicate(data.warehouses, "name", input.name, input.id)) {
      result = { ok: false, error: "اسم المخزن موجود بالفعل" };
      return;
    }
    const type = input.type ?? "main";
    if (type === "sub" && !input.parentId) {
      result = { ok: false, error: "المخزن الفرعي يجب ربطه بمخزن رئيسي" };
      return;
    }
    if (input.id && input.parentId === input.id) {
      result = { ok: false, error: "لا يمكن ربط المخزن بنفسه" };
      return;
    }

    const record: Warehouse = {
      id: input.id ?? uid("wh"),
      code,
      name: input.name.trim(),
      branchId: input.branchId,
      type,
      parentId: type === "sub" ? input.parentId ?? null : null,
      keeperId: input.keeperId ?? null,
      address: input.address?.trim() ?? "",
      note: input.note?.trim() ?? "",
      active: input.active ?? true,
    };

    if (input.id) data.warehouses = data.warehouses.map((w) => (w.id === input.id ? record : w));
    else data.warehouses.push(record);
    result = { ok: true, id: record.id };
  });
  return result;
}

export function deleteWarehouse(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const used =
      data.stockMoves.some((m) => m.warehouseId === id || m.toWarehouseId === id) ||
      data.salesInvoices.some((i) => i.warehouseId === id) ||
      data.purchaseInvoices.some((i) => i.warehouseId === id);
    if (used) {
      result = { ok: false, error: "لا يمكن حذف مخزن له حركات — يمكن إيقافه فقط" };
      return;
    }
    if (data.warehouses.some((w) => w.parentId === id)) {
      result = { ok: false, error: "لا يمكن حذف مخزن رئيسي له مخازن فرعية" };
      return;
    }
    data.warehouses = data.warehouses.filter((w) => w.id !== id);
  });
  return result;
}

export function toggleWarehouseActive(id: string) {
  mutate((data) => {
    const w = data.warehouses.find((x) => x.id === id);
    if (w) w.active = w.active === false;
  });
}

/* ===================== الأذون اليدوية ===================== */

function applyMoveStock(data: DbShape, move: StockMove, direction: 1 | -1) {
  if (moveSign(move.kind) === 0) return;
  for (const line of move.lines) {
    const product = data.products.find((p) => p.id === line.productId);
    if (!product) continue;
    const q = moveLineBaseQty(line) * (moveSign(move.kind) < 0 ? -1 : 1) * direction;
    product.stock += q;
  }
}

export function saveStockMove(
  input: Omit<StockMove, "id" | "no" | "source" | "refNo" | "refCode" | "refId"> & {
    id?: string;
    refNo?: string;
    refCode?: string;
  },
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
    if (input.kind === "transfer") {
      if (!input.toWarehouseId) {
        result = { ok: false, error: "يجب اختيار المخزن المستقبل للتحويل" };
        return;
      }
      if (input.toWarehouseId === input.warehouseId) {
        result = { ok: false, error: "لا يمكن التحويل لنفس المخزن" };
        return;
      }
    }

    const existing = input.id ? data.stockMoves.find((m) => m.id === input.id) : undefined;
    if (existing?.source !== undefined && existing.source !== "manual") {
      result = { ok: false, error: "هذا الإذن مرتبط بفاتورة — يتم تعديله من الفاتورة" };
      return;
    }
    if (existing && existing.status === "posted") applyMoveStock(data, existing, -1);

    const record: StockMove = {
      id: existing?.id ?? uid("mv"),
      no: existing?.no ?? nextMoveNo(data, input.kind),
      date: input.date || today(),
      kind: input.kind,
      source: "manual",
      warehouseId: input.warehouseId,
      toWarehouseId: input.kind === "transfer" ? input.toWarehouseId : null,
      refNo: input.refNo?.trim() ?? "",
      refCode: input.refCode?.trim() ?? "",
      refId: null,
      partyName: input.partyName?.trim() ?? "",
      branchId: input.branchId,
      userId: input.userId,
      lines: lines.map((l) => ({ ...l, qty: Number(l.qty || 0), cost: Number(l.cost || 0) })),
      note: input.note ?? "",
      status: input.status,
    };

    if (isDuplicate(data.stockMoves, "no", record.no, record.id)) {
      result = { ok: false, error: "رقم الإذن مكرر" };
      return;
    }

    if (record.status === "posted" && moveSign(record.kind) < 0 && !data.settings.allowNegativeStock) {
      for (const line of record.lines) {
        const product = data.products.find((p) => p.id === line.productId);
        if (!product) continue;
        if (moveLineBaseQty(line) > product.stock + 0.0001) {
          result = { ok: false, error: `الكمية المطلوبة من ${product.name} أكبر من المتاح (${product.stock})` };
          if (existing && existing.status === "posted") applyMoveStock(data, existing, 1);
          return;
        }
      }
    }

    if (existing) data.stockMoves = data.stockMoves.map((m) => (m.id === record.id ? record : m));
    else data.stockMoves.push(record);

    if (record.status === "posted") applyMoveStock(data, record, 1);
    result = { ok: true, id: record.id };
  });
  return result;
}

export function setStockMoveStatus(id: string, status: DocStatus): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const move = data.stockMoves.find((m) => m.id === id);
    if (!move) {
      result = { ok: false, error: "الإذن غير موجود" };
      return;
    }
    if (move.source !== "manual") {
      result = { ok: false, error: "إذن تلقائى مرتبط بفاتورة — غيّر حالة الفاتورة" };
      return;
    }
    if (move.status === status) return;
    if (move.status === "posted") applyMoveStock(data, move, -1);
    move.status = status;
    if (status === "posted") applyMoveStock(data, move, 1);
  });
  return result;
}

export function deleteStockMove(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const move = data.stockMoves.find((m) => m.id === id);
    if (!move) return;
    if (move.source !== "manual") {
      result = { ok: false, error: "لا يمكن حذف إذن تلقائى — احذف أو ألغِ الفاتورة المرتبطة" };
      return;
    }
    if (move.status === "posted") applyMoveStock(data, move, -1);
    data.stockMoves = data.stockMoves.filter((m) => m.id !== id);
  });
  return result;
}
