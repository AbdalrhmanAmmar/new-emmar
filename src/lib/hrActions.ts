import { today } from "./format";
import {
  isDuplicate,
  mutate,
  nextCode,
  nextNo,
  uid,
  type Attendance,
  type AttendanceStatus,
  type Employee,
  type Expense,
  type ExpenseItem,
} from "./mockDb";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/* ===================== بنود الصرف ===================== */

export function saveExpenseItem(input: Omit<ExpenseItem, "id"> & { id?: string }): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const name = input.name.trim();
    if (!name) {
      result = { ok: false, error: "اسم البند مطلوب" };
      return;
    }
    const code = input.code.trim() || nextCode("EX", data.expenseItems.map((i) => i.code));
    if (isDuplicate(data.expenseItems, "code", code, input.id)) {
      result = { ok: false, error: "كود البند مكرر" };
      return;
    }
    if (isDuplicate(data.expenseItems, "name", name, input.id)) {
      result = { ok: false, error: "اسم البند مكرر" };
      return;
    }
    const record: ExpenseItem = {
      id: input.id ?? uid("ei"),
      code,
      name,
      group: input.group?.trim() ?? "",
      note: input.note?.trim() ?? "",
      active: input.active ?? true,
    };
    if (input.id) {
      data.expenseItems = data.expenseItems.map((i) => (i.id === record.id ? record : i));
    } else {
      data.expenseItems.push(record);
    }
    result = { ok: true, id: record.id };
  });
  return result;
}

export function deleteExpenseItem(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (data.expenses.some((e) => e.itemId === id)) {
      result = { ok: false, error: "لا يمكن الحذف: البند مستخدم فى مصروفات مسجلة" };
      return;
    }
    data.expenseItems = data.expenseItems.filter((i) => i.id !== id);
  });
  return result;
}

/* ===================== المصروفات ===================== */

export function saveExpense(input: Omit<Expense, "id" | "no"> & { id?: string; no?: string }): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (!input.itemId) {
      result = { ok: false, error: "يجب اختيار بند الصرف" };
      return;
    }
    if (!(Number(input.amount) > 0)) {
      result = { ok: false, error: "المبلغ يجب أن يكون أكبر من صفر" };
      return;
    }
    if ((input.kind === "salary" || input.kind === "advance") && !input.employeeId) {
      result = { ok: false, error: "الرواتب والسلف تتطلب اختيار الموظف" };
      return;
    }
    const employee = input.employeeId
      ? data.employees.find((e) => e.id === input.employeeId)
      : undefined;
    if (input.employeeId && !employee) {
      result = { ok: false, error: "الموظف غير موجود" };
      return;
    }

    const existing = input.id ? data.expenses.find((e) => e.id === input.id) : undefined;
    const record: Expense = {
      id: existing?.id ?? uid("exp"),
      no: existing?.no ?? input.no ?? nextNo("EXP", data.expenses.map((e) => e.no)),
      date: input.date || today(),
      itemId: input.itemId,
      kind: input.kind,
      employeeId: input.employeeId ?? null,
      beneficiary: employee?.name ?? input.beneficiary?.trim() ?? "",
      amount: Number(input.amount || 0),
      branchId: input.branchId || data.branches[0]?.id || "",
      safeId: input.safeId ?? null,
      payMethod: input.payMethod,
      period: input.period || String(input.date || today()).slice(0, 7),
      note: input.note?.trim() ?? "",
      status: input.status,
    };

    if (isDuplicate(data.expenses, "no", record.no, record.id)) {
      result = { ok: false, error: "رقم المصروف مكرر" };
      return;
    }

    if (existing) {
      data.expenses = data.expenses.map((e) => (e.id === record.id ? record : e));
    } else {
      data.expenses.push(record);
    }
    result = { ok: true, id: record.id };
  });
  return result;
}

export function deleteExpense(id: string): ActionResult {
  mutate((data) => {
    data.expenses = data.expenses.filter((e) => e.id !== id);
  });
  return { ok: true };
}

/* ===================== الموظفون ===================== */

export function saveEmployee(input: Omit<Employee, "id"> & { id?: string }): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const name = input.name.trim();
    if (!name) {
      result = { ok: false, error: "اسم الموظف مطلوب" };
      return;
    }
    if (!(Number(input.baseSalary) > 0)) {
      result = { ok: false, error: "الراتب / الأجر يجب أن يكون أكبر من صفر" };
      return;
    }
    const code = input.code.trim() || nextCode("EMP", data.employees.map((e) => e.code));
    if (isDuplicate(data.employees, "code", code, input.id)) {
      result = { ok: false, error: "كود الموظف مكرر" };
      return;
    }
    if (input.nationalId?.trim() && isDuplicate(data.employees, "nationalId", input.nationalId, input.id)) {
      result = { ok: false, error: "الرقم القومى مسجل لموظف آخر" };
      return;
    }
    const record: Employee = {
      id: input.id ?? uid("em"),
      code,
      name,
      jobTitle: input.jobTitle?.trim() ?? "",
      department: input.department?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      nationalId: input.nationalId?.trim() ?? "",
      hireDate: input.hireDate || today(),
      branchId: input.branchId || data.branches[0]?.id || "",
      salaryType: input.salaryType,
      baseSalary: Number(input.baseSalary || 0),
      workDays: Number(input.workDays || 26) || 26,
      allowances: Number(input.allowances || 0),
      deductions: Number(input.deductions || 0),
      active: input.active ?? true,
      note: input.note?.trim() ?? "",
    };
    if (input.id) {
      data.employees = data.employees.map((e) => (e.id === record.id ? record : e));
    } else {
      data.employees.push(record);
    }
    result = { ok: true, id: record.id };
  });
  return result;
}

export function deleteEmployee(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (data.expenses.some((e) => e.employeeId === id)) {
      result = { ok: false, error: "لا يمكن الحذف: الموظف له مصروفات مسجلة — أوقفه بدلاً من الحذف" };
      return;
    }
    data.employees = data.employees.filter((e) => e.id !== id);
    data.attendance = data.attendance.filter((a) => a.employeeId !== id);
  });
  return result;
}

/* ===================== الحضور والغياب ===================== */

export interface AttendanceInput {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  lateMinutes?: number;
  overtimeHours?: number;
  note?: string;
}

/** تسجيل / تعديل حضور يوم واحد لموظف (بدون تكرار لنفس اليوم) */
export function markAttendance(input: AttendanceInput): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    if (!input.employeeId || !input.date) {
      result = { ok: false, error: "يجب اختيار الموظف والتاريخ" };
      return;
    }
    const existing = data.attendance.find(
      (a) => a.employeeId === input.employeeId && a.date === input.date,
    );
    const record: Attendance = {
      id: existing?.id ?? uid("at"),
      date: input.date,
      employeeId: input.employeeId,
      status: input.status,
      lateMinutes: input.status === "late" ? Number(input.lateMinutes || 0) : 0,
      overtimeHours: Number(input.overtimeHours || 0),
      note: input.note?.trim() ?? "",
    };
    if (existing) {
      data.attendance = data.attendance.map((a) => (a.id === record.id ? record : a));
    } else {
      data.attendance.push(record);
    }
    result = { ok: true, id: record.id };
  });
  return result;
}

/** تسجيل حضور جماعى لكل الموظفين النشطين فى يوم */
export function markAllAttendance(date: string, status: AttendanceStatus): ActionResult {
  mutate((data) => {
    for (const emp of data.employees.filter((e) => e.active)) {
      const existing = data.attendance.find((a) => a.employeeId === emp.id && a.date === date);
      if (existing) {
        existing.status = status;
        existing.lateMinutes = 0;
      } else {
        data.attendance.push({
          id: uid("at"),
          date,
          employeeId: emp.id,
          status,
          lateMinutes: 0,
          overtimeHours: 0,
          note: "",
        });
      }
    }
  });
  return { ok: true };
}

export function deleteAttendance(id: string): ActionResult {
  mutate((data) => {
    data.attendance = data.attendance.filter((a) => a.id !== id);
  });
  return { ok: true };
}
