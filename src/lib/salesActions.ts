import { today } from "./format";
import {
  isDuplicate,
  mutate,
  nextNo,
  uid,
  type DbShape,
  type DocStatus,
  type Party,
  type Product,
  type SalesInvoice,
} from "./mockDb";
import { addDays } from "./settingsRules";
import { invoiceTotals, discountPercentOf } from "./sales";
import { baseQty } from "./units";
import { removeInvoiceMove, syncInvoiceMove } from "./inventoryActions";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/* ===================== أثر الفاتورة (مخزون / آجل / خزينة) ===================== */

function linkedInvoiceId(inv: SalesInvoice) {
  return `link_${inv.id}`;
}

function linkedVoucherId(inv: SalesInvoice) {
  return `auto_${inv.id}`;
}

/** عكس أثر فاتورة مُرحّلة: إرجاع المخزون وحذف السجلات المرتبطة */
function unpost(data: DbShape, inv: SalesInvoice) {
  for (const line of inv.lines) {
    const product = data.products.find((p) => p.id === line.productId);
    if (product) product.stock += baseQty(line);
  }
  data.invoices = data.invoices.filter((i) => i.id !== linkedInvoiceId(inv));
  data.vouchers = data.vouchers.filter((v) => v.id !== linkedVoucherId(inv));
  removeInvoiceMove(data, inv.id);
}

/** تطبيق أثر فاتورة مُرحّلة: خصم المخزون وإنشاء المتبقي الآجل وسند القبض */
function post(data: DbShape, inv: SalesInvoice) {
  for (const line of inv.lines) {
    const product = data.products.find((p) => p.id === line.productId);
    if (product) product.stock -= baseQty(line);
  }

  // إذن صرف مخزني تلقائى بالرقم المرجعى لرقم وكود الفاتورة
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

  const totals = invoiceTotals({ ...inv, codePercent: discountPercentOf(data, inv.discountCode) });

  if (inv.customerId && totals.remaining > 0.01) {
    data.invoices.push({
      id: linkedInvoiceId(inv),
      no: inv.no,
      type: "sales",
      partyId: inv.customerId,
      date: inv.date,
      dueDate: inv.dueDate,
      total: totals.total,
      paid: totals.paid,
    });
  }

  if (totals.paid > 0.01 && inv.safeId) {
    data.vouchers.push({
      id: linkedVoucherId(inv),
      kind: "receipt",
      no: nextNo("RV", data.vouchers.map((v) => v.no)),
      date: inv.date,
      safeId: inv.safeId,
      branchId: inv.branchId,
      userId: inv.userId,
      partyType: inv.customerId ? "customer" : "other",
      partyId: inv.customerId,
      categoryId: inv.customerId ? null : "rv3",
      costCenter: "المبيعات",
      method: inv.payMethod === "card" ? "transfer" : "cash",
      reference: inv.no,
      amount: totals.paid,
      note: `تحصيل فاتورة مبيعات ${inv.no}`,
      status: "posted",
      allocations: [],
      reconciled: false,
      shiftId: null,
      auto: true,
    });
  }
}

/* ===================== حفظ فاتورة المبيعات ===================== */

export function saveSalesInvoice(
  input: Omit<SalesInvoice, "id" | "no"> & { id?: string; no?: string },
): ActionResult {
  let result: ActionResult = { ok: true };

  mutate((data) => {
    const lines = (input.lines ?? []).filter((l) => l.productId && Number(l.qty) > 0);
    if (lines.length === 0) {
      result = { ok: false, error: "يجب إضافة صنف واحد على الأقل بكمية صحيحة" };
      return;
    }
    if (!input.warehouseId) {
      result = { ok: false, error: "يجب اختيار المخزن المستهدف" };
      return;
    }
    const maxDisc = Number(data.settings.maxLineDiscountPct || 0);
    if (maxDisc > 0 && lines.some((l) => Number(l.discountPct || 0) > maxDisc + 0.0001)) {
      result = { ok: false, error: `أقصى خصم مسموح للسطر ${maxDisc}% حسب الإعدادات الرئيسية` };
      return;
    }
    if (input.payMethod === "credit" && !input.customerId) {
      result = { ok: false, error: "البيع الآجل يتطلب اختيار عميل مسجل" };
      return;
    }
    if (input.payMethod !== "credit" && !input.safeId) {
      result = { ok: false, error: "يجب اختيار الخزينة المستقبلة للتحصيل" };
      return;
    }

    const existing = input.id ? data.salesInvoices.find((i) => i.id === input.id) : undefined;

    // عكس الأثر القديم لمنع تكرار أو تداخل البيانات
    if (existing && existing.status === "posted") unpost(data, existing);

    // التحقق من توفر الكميات بالمخزون بعد العكس
    for (const line of lines) {
      const product = data.products.find((p) => p.id === line.productId);
      if (!product) {
        result = { ok: false, error: "صنف غير موجود" };
        return;
      }
      if (
        input.status === "posted" &&
        !data.settings.allowNegativeStock &&
        baseQty(line) > product.stock + 0.0001
      ) {
        result = {
          ok: false,
          error: `الكمية المطلوبة من ${product.name} أكبر من المتاح (${product.stock})`,
        };
        return;
      }
    }

    const totals = invoiceTotals({
      ...input,
      lines,
      codePercent: discountPercentOf(data, input.discountCode),
    });
    if (input.payMethod !== "credit" && totals.paid < totals.total - 0.01 && !input.customerId) {
      result = { ok: false, error: "العميل النقدي يجب سداد الفاتورة بالكامل أو اختيار عميل مسجل" };
      return;
    }

    const record: SalesInvoice = {
      id: existing?.id ?? uid("si"),
      no: existing?.no ?? input.no ?? nextNo("SO", data.salesInvoices.map((i) => i.no)),
      date: input.date || today(),
      dueDate:
        input.dueDate ||
        (input.payMethod === "credit"
          ? addDays(input.date || today(), data.settings.defaultPaymentDays)
          : input.date || today()),
      view: input.view,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      repId: input.repId ?? null,
      userId: input.userId,
      customerId: input.customerId ?? null,
      customerName: input.customerId
        ? data.customers.find((c) => c.id === input.customerId)?.name ?? input.customerName
        : input.customerName?.trim() || "عميل نقدي",
      lines,
      payMethod: input.payMethod,
      payCash: Number(input.payCash || 0),
      payCard: Number(input.payCard || 0),
      safeId: input.payMethod === "credit" ? null : input.safeId,
      discountCode: input.discountCode ?? "",
      note: input.note ?? "",
      status: input.status,
    };

    if (isDuplicate(data.salesInvoices, "no", record.no, record.id)) {
      result = { ok: false, error: "رقم الفاتورة مكرر" };
      return;
    }

    if (existing) {
      data.salesInvoices = data.salesInvoices.map((i) => (i.id === record.id ? record : i));
    } else {
      data.salesInvoices.push(record);
    }

    if (record.status === "posted") post(data, record);
    result = { ok: true, id: record.id };
  });

  return result;
}

export function setSalesInvoiceStatus(id: string, status: DocStatus): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const inv = data.salesInvoices.find((i) => i.id === id);
    if (!inv) {
      result = { ok: false, error: "الفاتورة غير موجودة" };
      return;
    }
    if (inv.status === status) return;
    if (inv.status === "posted") unpost(data, inv);
    inv.status = status;
    if (status === "posted") {
      for (const line of inv.lines) {
        const product = data.products.find((p) => p.id === line.productId);
        if (product && !data.settings.allowNegativeStock && baseQty(line) > product.stock + 0.0001) {
          result = { ok: false, error: `الكمية المطلوبة من ${product.name} أكبر من المتاح` };
          inv.status = "draft";
          return;
        }
      }
      post(data, inv);
    }
  });
  return result;
}

export function deleteSalesInvoice(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const inv = data.salesInvoices.find((i) => i.id === id);
    if (!inv) return;
    const linked = data.invoices.find((i) => i.id === linkedInvoiceId(inv));
    if (linked && linked.paid > 0.01) {
      result = { ok: false, error: "لا يمكن حذف فاتورة عليها تحصيلات — قم بإلغائها بدلاً من الحذف" };
      return;
    }
    if (inv.status === "posted") unpost(data, inv);
    data.salesInvoices = data.salesInvoices.filter((i) => i.id !== id);
  });
  return result;
}

/* ===================== الأصناف ===================== */

export function saveProduct(input: Omit<Product, "id"> & { id?: string }): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (!input.name?.trim()) {
      result = { ok: false, error: "اسم الصنف مطلوب" };
      return;
    }
    if (!input.code?.trim()) {
      result = { ok: false, error: "كود الصنف مطلوب" };
      return;
    }
    if (isDuplicate(data.products, "code", input.code, input.id)) {
      result = { ok: false, error: "كود الصنف مستخدم بالفعل" };
      return;
    }
    if (input.barcode && isDuplicate(data.products, "barcode", input.barcode, input.id)) {
      result = { ok: false, error: "الباركود مستخدم بالفعل" };
      return;
    }

    const record: Product = {
      id: input.id ?? uid("p"),
      code: input.code.trim(),
      name: input.name.trim(),
      barcode: input.barcode?.trim() ?? "",
      serial: input.serial?.trim() ?? "",
      unit: input.unit,
      unitPrice: Number(input.unitPrice || 0),
      wholesalePrice: Number(input.wholesalePrice || 0),
      cost: Number(input.cost || 0),
      taxRate: Number(input.taxRate ?? data.settings.vatRate),
      category: input.category?.trim() ?? "",
      stock: Number(input.stock || 0),
      minStock: Number(input.minStock || 0),
      active: input.active ?? true,
      units: (input.units ?? [])
        .filter((u) => u.code?.trim() && Number(u.factor) > 0)
        .map((u) => ({
          id: u.id,
          code: u.code.trim(),
          name: u.name?.trim() || u.code.trim(),
          factor: Number(u.factor),
          price: Number(u.price || 0),
          wholesalePrice: Number(u.wholesalePrice || 0),
        })),
    };

    if (input.id) {
      data.products = data.products.map((p) => (p.id === input.id ? record : p));
    } else {
      data.products.push(record);
    }
    result = { ok: true, id: record.id };
  });
  return result;
}

export function updateProductPrices(
  id: string,
  prices: { unitPrice: number; wholesalePrice: number; cost: number },
): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const product = data.products.find((p) => p.id === id);
    if (!product) {
      result = { ok: false, error: "الصنف غير موجود" };
      return;
    }
    product.unitPrice = Number(prices.unitPrice || 0);
    product.wholesalePrice = Number(prices.wholesalePrice || 0);
    product.cost = Number(prices.cost || 0);
  });
  return result;
}

export function deleteProduct(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const used = data.salesInvoices.some((inv) => inv.lines.some((l) => l.productId === id));
    if (used) {
      result = { ok: false, error: "لا يمكن حذف صنف مستخدم في فواتير — يمكن إيقافه فقط" };
      return;
    }
    data.products = data.products.filter((p) => p.id !== id);
  });
  return result;
}

export function toggleProductActive(id: string) {
  mutate((data) => {
    const product = data.products.find((p) => p.id === id);
    if (product) product.active = !product.active;
  });
}

/* ===================== العملاء ===================== */

export function saveCustomer(input: Omit<Party, "id"> & { id?: string }): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (!input.name?.trim()) {
      result = { ok: false, error: "اسم العميل مطلوب" };
      return;
    }
    const code = input.code?.trim() || nextNo("CU", data.customers.map((c) => c.code));
    if (isDuplicate(data.customers, "code", code, input.id)) {
      result = { ok: false, error: "كود العميل مستخدم بالفعل" };
      return;
    }
    if (isDuplicate(data.customers, "name", input.name, input.id)) {
      result = { ok: false, error: "اسم العميل موجود بالفعل" };
      return;
    }

    const record: Party = {
      id: input.id ?? uid("c"),
      code,
      name: input.name.trim(),
      phone: input.phone?.trim() ?? "",
      branchId: input.branchId,
      notifyInvoice: input.notifyInvoice ?? false,
      phone2: input.phone2?.trim() || undefined,
      email: input.email?.trim() || undefined,
      contactPerson: input.contactPerson?.trim() || undefined,
      address: input.address?.trim() || undefined,
      city: input.city?.trim() || undefined,
      commercialNo: input.commercialNo?.trim() || undefined,
      taxNo: input.taxNo?.trim() || undefined,
      taxOffice: input.taxOffice?.trim() || undefined,
      activity: input.activity?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };

    if (input.id) {
      data.customers = data.customers.map((c) => (c.id === input.id ? record : c));
    } else {
      data.customers.push(record);
    }
    result = { ok: true, id: record.id };
  });
  return result;
}

export function deleteCustomer(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const used =
      data.salesInvoices.some((i) => i.customerId === id) ||
      data.invoices.some((i) => i.type === "sales" && i.partyId === id) ||
      data.vouchers.some((v) => v.partyType === "customer" && v.partyId === id);
    if (used) {
      result = { ok: false, error: "لا يمكن حذف عميل له حركات مالية" };
      return;
    }
    data.customers = data.customers.filter((c) => c.id !== id);
  });
  return result;
}

/* ===================== أكواد الخصم ===================== */

export function saveDiscountCode(code: string, percent: number, id?: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      result = { ok: false, error: "الكود مطلوب" };
      return;
    }
    if (isDuplicate(data.discountCodes, "code", clean, id)) {
      result = { ok: false, error: "الكود مستخدم بالفعل" };
      return;
    }
    if (percent < 0 || percent > 100) {
      result = { ok: false, error: "النسبة يجب أن تكون بين 0 و 100" };
      return;
    }
    if (id) {
      data.discountCodes = data.discountCodes.map((dc) =>
        dc.id === id ? { ...dc, code: clean, percent } : dc,
      );
    } else {
      data.discountCodes.push({ id: uid("dc"), code: clean, percent, active: true });
    }
  });
  return result;
}

export function deleteDiscountCode(id: string) {
  mutate((data) => {
    data.discountCodes = data.discountCodes.filter((dc) => dc.id !== id);
  });
}
