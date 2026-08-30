import type {
  Attendance,
  AttendanceStatus,
  DbShape,
  Employee,
  Expense,
  ExpenseItem,
  PayrollAdjustment,
} from "@/lib/mockDb";

/* ===================== حسابات الرواتب والحضور ===================== */

export interface Period {
  from?: string;
  to?: string;
}

export function inPeriod(date: string, period: Period): boolean {
  if (period.from && date < period.from) return false;
  if (period.to && date > period.to) return false;
  return true;
}

/** أول وآخر يوم فى شهر YYYY-MM */
export function monthRange(month: string): Period {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** الشهر الحالى بصيغة YYYY-MM */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** أجر اليوم الواحد */
export function dayRate(emp: Employee): number {
  if (emp.salaryType === "daily") return Number(emp.baseSalary || 0);
  const days = Number(emp.workDays || 26) || 26;
  return Number(emp.baseSalary || 0) / days;
}

/** أجر الساعة (يوم عمل 8 ساعات) */
export function hourRate(emp: Employee): number {
  return dayRate(emp) / 8;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  leave: number;
  holiday: number;
  lateMinutes: number;
  overtimeHours: number;
  /** أيام مدفوعة (حضور + تأخير + إجازة) */
  paidDays: number;
}

export function attendanceSummary(rows: Attendance[]): AttendanceSummary {
  const sum: AttendanceSummary = {
    present: 0,
    late: 0,
    absent: 0,
    leave: 0,
    holiday: 0,
    lateMinutes: 0,
    overtimeHours: 0,
    paidDays: 0,
  };
  for (const row of rows) {
    sum[row.status] += 1;
    sum.lateMinutes += Number(row.lateMinutes || 0);
    sum.overtimeHours += Number(row.overtimeHours || 0);
  }
  sum.paidDays = sum.present + sum.late + sum.leave;
  return sum;
}

export function employeeAttendance(data: DbShape, employeeId: string, period: Period): Attendance[] {
  return data.attendance
    .filter((a) => a.employeeId === employeeId && inPeriod(a.date, period))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** مصروفات مرتبطة بموظف (رواتب / سلف) */
export function employeeExpenses(data: DbShape, employeeId: string, period: Period): Expense[] {
  return data.expenses
    .filter(
      (e) => e.employeeId === employeeId && e.status !== "cancelled" && inPeriod(e.date, period),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** أشهر الفترة (YYYY-MM) التى تدخل فى الحساب */
function periodMonths(period: Period): { from: string; to: string } {
  return {
    from: (period.from ?? "0000-00").slice(0, 7),
    to: (period.to ?? "9999-99").slice(0, 7),
  };
}

/** بدلات وخصومات الموظف المرتبطة بشهر داخل الفترة */
export function employeeAdjustments(
  data: DbShape,
  employeeId: string,
  period: Period,
): PayrollAdjustment[] {
  const { from, to } = periodMonths(period);
  return (data.adjustments ?? [])
    .filter((a) => a.employeeId === employeeId && a.month >= from && a.month <= to)
    .sort((a, b) => a.month.localeCompare(b.month) || a.kind.localeCompare(b.kind));
}

export function monthAdjustments(data: DbShape, month: string): PayrollAdjustment[] {
  return (data.adjustments ?? []).filter((a) => a.month === month);
}

export interface PayrollResult {
  dayRate: number;
  attendance: AttendanceSummary;
  earnedDays: number;
  basicEarned: number;
  overtimePay: number;
  allowances: number;
  lateDeduction: number;
  absenceDeduction: number;
  fixedDeductions: number;
  /** بدلات الشهر المضافة يدويًا */
  extraAllowances: number;
  /** خصومات الشهر المضافة يدويًا */
  extraDeductions: number;
  adjustments: PayrollAdjustment[];
  advances: number;
  netDue: number;
  paidSalaries: number;
  balance: number;
}

/** حساب مستحقات الموظف فى فترة بناءً على الحضور والمدفوع له */
export function payroll(data: DbShape, emp: Employee, period: Period): PayrollResult {
  const rows = employeeAttendance(data, emp.id, period);
  const att = attendanceSummary(rows);
  const rate = dayRate(emp);

  const basicEarned = att.paidDays * rate;
  const overtimePay = att.overtimeHours * hourRate(emp) * 1.5;
  const lateDeduction = (att.lateMinutes / 60) * hourRate(emp);
  const absenceDeduction = att.absent * rate;
  const adjustments = employeeAdjustments(data, emp.id, period);
  const extraAllowances = adjustments
    .filter((a) => a.kind === "allowance")
    .reduce((acc, a) => acc + Number(a.amount || 0), 0);
  const extraDeductions = adjustments
    .filter((a) => a.kind === "deduction")
    .reduce((acc, a) => acc + Number(a.amount || 0), 0);

  const allowances = Number(emp.allowances || 0) + extraAllowances;
  const fixedDeductions = Number(emp.deductions || 0) + extraDeductions;

  const paid = employeeExpenses(data, emp.id, period);
  const paidSalaries = paid
    .filter((e) => e.kind === "salary")
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const advances = paid
    .filter((e) => e.kind === "advance")
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const netDue =
    basicEarned + overtimePay + allowances - lateDeduction - fixedDeductions - advances;

  return {
    dayRate: rate,
    attendance: att,
    earnedDays: att.paidDays,
    basicEarned,
    overtimePay,
    allowances,
    lateDeduction,
    absenceDeduction,
    fixedDeductions,
    extraAllowances,
    extraDeductions,
    adjustments,
    advances,
    netDue: Math.max(0, netDue),
    paidSalaries,
    balance: Math.max(0, netDue) - paidSalaries,
  };
}

export function expenseItemName(data: DbShape, itemId: string): string {
  return data.expenseItems.find((i) => i.id === itemId)?.name ?? "-";
}

export function employeeName(data: DbShape, employeeId: string | null): string {
  if (!employeeId) return "-";
  return data.employees.find((e) => e.id === employeeId)?.name ?? "-";
}

export function activeExpenseItems(data: DbShape): ExpenseItem[] {
  return data.expenseItems.filter((i) => i.active);
}

export function activeEmployees(data: DbShape): Employee[] {
  return data.employees.filter((e) => e.active);
}

export const ATTENDANCE_TONE: Record<AttendanceStatus, "green" | "gold" | "red" | "gray"> = {
  present: "green",
  late: "gold",
  absent: "red",
  leave: "gray",
  holiday: "gray",
};
