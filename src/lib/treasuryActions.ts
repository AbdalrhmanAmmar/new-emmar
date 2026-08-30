import { dateFmt, money } from "./format";
import {
  isDuplicate,
  mutate,
  nextNo,
  uid,
  type DocStatus,
  type Shift,
  type Transfer,
  type Voucher,
} from "./mockDb";
import { applyAllocations, invoiceRemaining, safeBalance } from "./treasury";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/* ===================== السندات ===================== */

export function saveVoucher(input: Omit<Voucher, "id" | "no"> & { id?: string; no?: string }): ActionResult {
  let result: ActionResult = { ok: true };

  mutate((data) => {
    if (!input.safeId) {
      result = { ok: false, error: "يجب اختيار الخزينة" };
      return;
    }
    if (!(Number(input.amount) > 0)) {
      result = { ok: false, error: "المبلغ يجب أن يكون أكبر من صفر" };
      return;
    }
    if (input.partyType !== "other" && !input.partyId) {
      result = { ok: false, error: "يجب اختيار العميل أو المورد" };
      return;
    }
    if (input.partyType === "other" && !input.categoryId) {
      result = { ok: false, error: "يجب اختيار بند الإيراد أو المصروف" };
      return;
    }

    const allocations = (input.allocations ?? []).filter((a) => Number(a.amount) > 0);
    const allocTotal = allocations.reduce((acc, a) => acc + Number(a.amount), 0);
    if (allocTotal - Number(input.amount) > 0.01) {
      result = { ok: false, error: "إجمالي التسوية أكبر من مبلغ السند" };
      return;
    }

    const existing = input.id ? data.vouchers.find((v) => v.id === input.id) : undefined;

    // عكس الأثر القديم قبل الحفظ لمنع تداخل أو تكرار البيانات
    if (existing && existing.status === "posted") applyAllocations(data, existing, -1);

    // التحقق من عدم تجاوز المتبقي على الفاتورة
    for (const alloc of allocations) {
      const inv = data.invoices.find((i) => i.id === alloc.invoiceId);
      if (!inv) {
        result = { ok: false, error: "فاتورة غير موجودة" };
        return;
      }
      if (Number(alloc.amount) - invoiceRemaining(inv) > 0.01) {
        result = { ok: false, error: `المبلغ المسدد للفاتورة ${inv.no} أكبر من المتبقي عليها` };
        if (existing && existing.status === "posted") applyAllocations(data, existing, 1);
        return;
      }
    }

    const prefix = input.kind === "receipt" ? "RV" : "PV";
    const no =
      existing?.no ??
      input.no ??
      nextNo(
        prefix,
        data.vouchers.filter((v) => v.kind === input.kind).map((v) => v.no),
      );

    if (isDuplicate(data.vouchers, "no", no, existing?.id)) {
      result = { ok: false, error: "رقم السند مكرر" };
      return;
    }

    const record: Voucher = {
      id: existing?.id ?? uid("v"),
      no,
      kind: input.kind,
      date: input.date,
      safeId: input.safeId,
      branchId: input.branchId,
      userId: input.userId,
      partyType: input.partyType,
      partyId: input.partyType === "other" ? null : input.partyId,
      categoryId: input.partyType === "other" ? input.categoryId : null,
      costCenter: input.costCenter ?? "",
      method: input.method,
      reference: input.reference ?? "",
      amount: Number(input.amount),
      note: input.note ?? "",
      status: input.status,
      allocations,
      reconciled: input.reconciled ?? false,
      shiftId: input.shiftId ?? null,
    };

    // منع الصرف بأكثر من رصيد الخزينة
    if (record.status === "posted" && record.kind === "payment") {
      const balance = safeBalance(data, record.safeId);
      const previous = existing && existing.status === "posted" && existing.kind === "payment" ? existing.amount : 0;
      if (record.amount - (balance + previous) > 0.01) {
        result = { ok: false, error: `رصيد الخزينة غير كافٍ (المتاح ${money(balance + previous)})` };
        if (existing && existing.status === "posted") applyAllocations(data, existing, 1);
        return;
      }
    }

    if (existing) {
      Object.assign(existing, record);
      if (record.status === "posted") applyAllocations(data, record, 1);
    } else {
      data.vouchers.push(record);
      if (record.status === "posted") applyAllocations(data, record, 1);
    }

    result = { ok: true, id: record.id };
  });

  return result;
}

export function setVoucherStatus(id: string, status: DocStatus): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const voucher = data.vouchers.find((v) => v.id === id);
    if (!voucher) {
      result = { ok: false, error: "السند غير موجود" };
      return;
    }
    if (voucher.shiftId) {
      const shift = data.shifts.find((s) => s.id === voucher.shiftId);
      if (shift?.status === "closed") {
        result = { ok: false, error: "لا يمكن تعديل سند داخل وردية مقفلة" };
        return;
      }
    }
    if (voucher.status === status) return;
    if (voucher.status === "posted") applyAllocations(data, voucher, -1);
    voucher.status = status;
    if (status === "posted") applyAllocations(data, voucher, 1);
  });
  return result;
}

export function deleteVoucher(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const voucher = data.vouchers.find((v) => v.id === id);
    if (!voucher) return;
    const shift = voucher.shiftId ? data.shifts.find((s) => s.id === voucher.shiftId) : null;
    if (shift?.status === "closed") {
      result = { ok: false, error: "لا يمكن حذف سند داخل وردية مقفلة" };
      return;
    }
    if (voucher.status === "posted") applyAllocations(data, voucher, -1);
    data.vouchers = data.vouchers.filter((v) => v.id !== id);
  });
  return result;
}

export function toggleReconciled(id: string) {
  mutate((data) => {
    const voucher = data.vouchers.find((v) => v.id === id);
    if (voucher) voucher.reconciled = !voucher.reconciled;
  });
}

/* ===================== التحويلات ===================== */

export function saveTransfer(
  input: Omit<Transfer, "id" | "no"> & { id?: string },
): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (!input.fromSafeId || !input.toSafeId) {
      result = { ok: false, error: "يجب اختيار الخزينة المُحوّل منها وإليها" };
      return;
    }
    if (input.fromSafeId === input.toSafeId) {
      result = { ok: false, error: "لا يمكن التحويل لنفس الخزينة" };
      return;
    }
    if (!(Number(input.amount) > 0)) {
      result = { ok: false, error: "المبلغ يجب أن يكون أكبر من صفر" };
      return;
    }

    const existing = input.id ? data.transfers.find((t) => t.id === input.id) : undefined;
    const balance = safeBalance(data, input.fromSafeId);
    const previous = existing && existing.status === "posted" ? existing.amount + existing.fee : 0;
    const needed = Number(input.amount) + Number(input.fee ?? 0);
    if (input.status === "posted" && needed - (balance + previous) > 0.01) {
      result = { ok: false, error: `رصيد الخزينة غير كافٍ (المتاح ${money(balance + previous)})` };
      return;
    }

    const record: Transfer = {
      id: existing?.id ?? uid("tr"),
      no: existing?.no ?? nextNo("TF", data.transfers.map((t) => t.no)),
      date: input.date,
      fromSafeId: input.fromSafeId,
      toSafeId: input.toSafeId,
      amount: Number(input.amount),
      fee: Number(input.fee ?? 0),
      userId: input.userId,
      note: input.note ?? "",
      status: input.status,
    };

    if (existing) Object.assign(existing, record);
    else data.transfers.push(record);

    result = { ok: true, id: record.id };
  });
  return result;
}

export function deleteTransfer(id: string) {
  mutate((data) => {
    data.transfers = data.transfers.filter((t) => t.id !== id);
  });
}

/* ===================== الورديات ===================== */

export function openShift(safeId: string, userId: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const already = data.shifts.find((s) => s.safeId === safeId && s.status === "open");
    if (already) {
      result = { ok: false, error: "توجد وردية مفتوحة بالفعل لهذه الخزينة" };
      return;
    }
    const shift: Shift = {
      id: uid("sh"),
      no: nextNo("SH", data.shifts.map((s) => s.no)),
      safeId,
      userId,
      openedAt: new Date().toISOString().slice(0, 16),
      closedAt: null,
      openingBalance: safeBalance(data, safeId),
      systemBalance: null,
      countedBalance: null,
      difference: null,
      reason: "",
      status: "open",
    };
    data.shifts.push(shift);
    result = { ok: true, id: shift.id };
  });
  return result;
}

/** إغلاق الوردية: مقارنة الرصيد الدفتري بالفعلي وتسجيل الفرق كحركة تسوية */
export function closeShift(
  shiftId: string,
  countedBalance: number,
  reason: string,
  settleDifference: boolean,
): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const shift = data.shifts.find((s) => s.id === shiftId);
    if (!shift) {
      result = { ok: false, error: "الوردية غير موجودة" };
      return;
    }
    if (shift.status === "closed") {
      result = { ok: false, error: "الوردية مقفلة بالفعل" };
      return;
    }

    const systemBalance = safeBalance(data, shift.safeId);
    const difference = Number(countedBalance) - systemBalance;

    if (settleDifference && Math.abs(difference) > 0.009) {
      const kind = difference > 0 ? "receipt" : "payment";
      const category = data.categories.find((c) => c.name === "فروقات خزينة");
      const voucher: Voucher = {
        id: uid("v"),
        kind,
        no: nextNo(
          kind === "receipt" ? "RV" : "PV",
          data.vouchers.filter((v) => v.kind === kind).map((v) => v.no),
        ),
        date: new Date().toISOString().slice(0, 10),
        safeId: shift.safeId,
        branchId: data.safes.find((s) => s.id === shift.safeId)?.branchId ?? "br1",
        userId: shift.userId,
        partyType: "other",
        partyId: null,
        categoryId: category?.id ?? null,
        costCenter: "الخزينة",
        method: "cash",
        reference: shift.no,
        amount: Math.abs(difference),
        note: `تسوية فرق تقفيل وردية ${shift.no}`,
        status: "posted",
        allocations: [],
        reconciled: false,
        shiftId: shift.id,
        auto: true,
      };
      data.vouchers.push(voucher);
    }

    shift.systemBalance = systemBalance;
    shift.countedBalance = Number(countedBalance);
    shift.difference = difference;
    shift.reason = reason;
    shift.closedAt = new Date().toISOString().slice(0, 16);
    shift.status = "closed";
  });
  return result;
}

/* ===================== الخزن ===================== */

export function deleteSafe(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const used =
      data.vouchers.some((v) => v.safeId === id) ||
      data.transfers.some((t) => t.fromSafeId === id || t.toSafeId === id);
    if (used) {
      result = { ok: false, error: "لا يمكن حذف خزينة لها حركات — يمكن تعطيلها فقط" };
      return;
    }
    data.safes = data.safes.filter((s) => s.id !== id);
  });
  return result;
}

export function toggleSafeActive(id: string) {
  mutate((data) => {
    const safe = data.safes.find((s) => s.id === id);
    if (safe) safe.active = !safe.active;
  });
}

export function voucherPrintFields(
  data: ReturnType<typeof import("./mockDb").getDb>,
  voucher: Voucher,
): Array<[string, string]> {
  const safe = data.safes.find((s) => s.id === voucher.safeId);
  const user = data.users.find((u) => u.id === voucher.userId);
  const branch = data.branches.find((b) => b.id === voucher.branchId);
  const party =
    voucher.partyType === "customer"
      ? data.customers.find((c) => c.id === voucher.partyId)?.name
      : voucher.partyType === "supplier"
        ? data.suppliers.find((s) => s.id === voucher.partyId)?.name
        : data.categories.find((c) => c.id === voucher.categoryId)?.name;

  return [
    ["رقم السند", voucher.no],
    ["التاريخ", dateFmt(voucher.date)],
    ["الخزينة", safe?.name ?? "-"],
    ["الفرع", branch?.name ?? "-"],
    [voucher.kind === "receipt" ? "المستلم منه" : "المدفوع له", party ?? "-"],
    ["طريقة الدفع", voucher.method],
    ["المبلغ", money(voucher.amount)],
    ["المستخدم", user?.name ?? "-"],
    ["مركز التكلفة", voucher.costCenter || "-"],
    ["رقم المرجع", voucher.reference || "-"],
    ["البيان", voucher.note || "-"],
    ["الحالة", voucher.status],
  ];
}
