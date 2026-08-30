import { today } from "./format";
import { addDays } from "./settingsRules";
import {
  isDuplicate,
  mutate,
  nextNo,
  uid,
  type DbShape,
  type DocStatus,
  type Party,
  type PurchaseInvoice,
} from "./mockDb";
import { purchaseTotals } from "./purchases";
import { baseQty, lineFactor } from "./units";
import type { ActionResult } from "./salesActions";

function linkedInvoiceId(inv: PurchaseInvoice) {
  return `plink_${inv.id}`;
}

function linkedVoucherId(inv: PurchaseInvoice) {
  return `pauto_${inv.id}`;
}

/** عكس أثر فاتورة شراء مُرحّلة: خصم المخزون وحذف السجلات المرتبطة */
function unpost(data: DbShape, inv: PurchaseInvoice) {
  for (const line of inv.lines) {
    const product = data.products.find((p) => p.id === line.productId);
    if (product) product.stock -= baseQty(line);
  }
  data.invoices = data.invoices.filter((i) => i.id !== linkedInvoiceId(inv));
  data.vouchers = data.vouchers.filter((v) => v.id !== linkedVoucherId(inv));
}

/** تطبيق أثر فاتورة شراء: زيادة المخزون وتحديث التكلفة وإنشاء المستحق وسند الصرف */
function post(data: DbShape, inv: PurchaseInvoice) {
  for (const line of inv.lines) {
    const product = data.products.find((p) => p.id === line.productId);
    if (!product) continue;
    const qty = baseQty(line);
    const oldQty = Math.max(0, product.stock);
    // تكلفة الوحدة الأساسية = سعر وحدة الشراء ÷ معامل التحويل
    const newCost = Number(line.price || 0) / lineFactor(line);
    // متوسط التكلفة المرجح
    product.cost = qty + oldQty > 0 ? (product.cost * oldQty + newCost * qty) / (qty + oldQty) : newCost;
    product.stock += qty;
  }

  const totals = purchaseTotals(inv);

  if (inv.supplierId && totals.remaining > 0.01) {
    data.invoices.push({
      id: linkedInvoiceId(inv),
      no: inv.no,
      type: "purchase",
      partyId: inv.supplierId,
      date: inv.date,
      dueDate: inv.dueDate,
      total: totals.total,
      paid: totals.paid,
    });
  }

  if (totals.paid > 0.01 && inv.safeId) {
    data.vouchers.push({
      id: linkedVoucherId(inv),
      kind: "payment",
      no: nextNo("PV", data.vouchers.map((v) => v.no)),
      date: inv.date,
      safeId: inv.safeId,
      branchId: inv.branchId,
      userId: inv.userId,
      partyType: inv.supplierId ? "supplier" : "other",
      partyId: inv.supplierId,
      categoryId: inv.supplierId ? null : "ex5",
      costCenter: "المشتريات",
      method: inv.payMethod === "card" ? "transfer" : "cash",
      reference: inv.no,
      amount: totals.paid,
      note: `سداد فاتورة مشتريات ${inv.no}`,
      status: "posted",
      allocations: [],
      reconciled: false,
      shiftId: null,
      auto: true,
    });
  }
}

export function savePurchaseInvoice(
  input: Omit<PurchaseInvoice, "id" | "no"> & { id?: string; no?: string },
): ActionResult {
  let result: ActionResult = { ok: true };

  mutate((data) => {
    const lines = (input.lines ?? []).filter((l) => l.productId && Number(l.qty) > 0);
    if (lines.length === 0) {
      result = { ok: false, error: "يجب إضافة صنف واحد على الأقل بكمية صحيحة" };
      return;
    }
    if (!input.warehouseId) {
      result = { ok: false, error: "يجب اختيار المخزن المستقبل للبضاعة" };
      return;
    }
    if (input.payMethod === "credit" && !input.supplierId) {
      result = { ok: false, error: "الشراء الآجل يتطلب اختيار مورد مسجل" };
      return;
    }
    if (input.payMethod !== "credit" && !input.safeId) {
      result = { ok: false, error: "يجب اختيار الخزينة التى سيتم الصرف منها" };
      return;
    }

    const existing = input.id ? data.purchaseInvoices.find((i) => i.id === input.id) : undefined;
    if (existing && existing.status === "posted") unpost(data, existing);

    const totals = purchaseTotals({ ...input, lines });
    if (input.payMethod !== "credit" && totals.paid < totals.total - 0.01 && !input.supplierId) {
      result = { ok: false, error: "المورد النقدي يجب سداد فاتورته بالكامل أو اختيار مورد مسجل" };
      return;
    }
    if (input.payMethod !== "credit" && input.safeId) {
      const safe = data.safes.find((s) => s.id === input.safeId);
      if (!safe) {
        result = { ok: false, error: "الخزينة غير موجودة" };
        return;
      }
    }

    const record: PurchaseInvoice = {
      id: existing?.id ?? uid("pi"),
      no: existing?.no ?? input.no ?? nextNo("PO", data.purchaseInvoices.map((i) => i.no)),
      date: input.date || today(),
      dueDate:
        input.dueDate ||
        (input.payMethod === "credit"
          ? addDays(input.date || today(), data.settings.defaultPaymentDays)
          : input.date || today()),
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      userId: input.userId,
      supplierId: input.supplierId ?? null,
      supplierName: input.supplierId
        ? data.suppliers.find((s) => s.id === input.supplierId)?.name ?? input.supplierName
        : input.supplierName?.trim() || "مورد نقدي",
      supplierInvoiceNo: input.supplierInvoiceNo?.trim() ?? "",
      lines,
      payMethod: input.payMethod,
      payCash: Number(input.payCash || 0),
      payCard: Number(input.payCard || 0),
      safeId: input.payMethod === "credit" ? null : input.safeId,
      note: input.note ?? "",
      status: input.status,
    };

    if (isDuplicate(data.purchaseInvoices, "no", record.no, record.id)) {
      result = { ok: false, error: "رقم فاتورة الشراء مكرر" };
      return;
    }
    if (
      record.supplierInvoiceNo &&
      data.purchaseInvoices.some(
        (i) =>
          i.id !== record.id &&
          i.supplierId === record.supplierId &&
          i.supplierInvoiceNo &&
          i.supplierInvoiceNo === record.supplierInvoiceNo,
      )
    ) {
      result = { ok: false, error: "رقم فاتورة المورد مسجل بالفعل لنفس المورد" };
      return;
    }

    if (existing) {
      data.purchaseInvoices = data.purchaseInvoices.map((i) => (i.id === record.id ? record : i));
    } else {
      data.purchaseInvoices.push(record);
    }

    if (record.status === "posted") post(data, record);
    result = { ok: true, id: record.id };
  });

  return result;
}

export function setPurchaseInvoiceStatus(id: string, status: DocStatus): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const inv = data.purchaseInvoices.find((i) => i.id === id);
    if (!inv) {
      result = { ok: false, error: "الفاتورة غير موجودة" };
      return;
    }
    if (inv.status === status) return;
    if (inv.status === "posted") {
      for (const line of inv.lines) {
        const product = data.products.find((p) => p.id === line.productId);
        if (product && baseQty(line) > product.stock + 0.0001) {
          result = { ok: false, error: `لا يمكن إلغاء الترحيل: تم بيع كميات من ${product.name}` };
          return;
        }
      }
      unpost(data, inv);
    }
    inv.status = status;
    if (status === "posted") post(data, inv);
  });
  return result;
}

export function deletePurchaseInvoice(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const inv = data.purchaseInvoices.find((i) => i.id === id);
    if (!inv) return;
    const linked = data.invoices.find((i) => i.id === linkedInvoiceId(inv));
    if (linked && linked.paid > 0.01) {
      result = { ok: false, error: "لا يمكن حذف فاتورة عليها مدفوعات — قم بإلغائها بدلاً من الحذف" };
      return;
    }
    if (inv.status === "posted") {
      for (const line of inv.lines) {
        const product = data.products.find((p) => p.id === line.productId);
        if (product && baseQty(line) > product.stock + 0.0001) {
          result = { ok: false, error: `لا يمكن الحذف: تم بيع كميات من ${product.name}` };
          return;
        }
      }
      unpost(data, inv);
    }
    data.purchaseInvoices = data.purchaseInvoices.filter((i) => i.id !== id);
  });
  return result;
}

/* ===================== الموردون ===================== */

export function saveSupplier(input: Omit<Party, "id"> & { id?: string }): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (!input.name?.trim()) {
      result = { ok: false, error: "اسم المورد مطلوب" };
      return;
    }
    const code = input.code?.trim() || nextNo("SU", data.suppliers.map((s) => s.code));
    if (isDuplicate(data.suppliers, "code", code, input.id)) {
      result = { ok: false, error: "كود المورد مستخدم بالفعل" };
      return;
    }
    if (isDuplicate(data.suppliers, "name", input.name, input.id)) {
      result = { ok: false, error: "اسم المورد موجود بالفعل" };
      return;
    }

    const record: Party = {
      id: input.id ?? uid("s"),
      code,
      name: input.name.trim(),
      phone: input.phone?.trim() ?? "",
      branchId: input.branchId,
    };

    if (input.id) {
      data.suppliers = data.suppliers.map((s) => (s.id === input.id ? record : s));
    } else {
      data.suppliers.push(record);
    }
    result = { ok: true, id: record.id };
  });
  return result;
}

export function deleteSupplier(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (data.purchaseInvoices.some((i) => i.supplierId === id)) {
      result = { ok: false, error: "لا يمكن حذف مورد له فواتير شراء" };
      return;
    }
    if (data.vouchers.some((v) => v.partyType === "supplier" && v.partyId === id)) {
      result = { ok: false, error: "لا يمكن حذف مورد له سندات مالية" };
      return;
    }
    data.suppliers = data.suppliers.filter((s) => s.id !== id);
  });
  return result;
}
