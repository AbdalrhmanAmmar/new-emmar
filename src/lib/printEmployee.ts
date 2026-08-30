import { dateFmt, money, num } from "@/lib/format";
import { printHtml } from "@/lib/printDoc";
import type { PayrollResult } from "@/lib/hr";
import { ATTENDANCE_LABEL, EXPENSE_KIND_LABEL, SALARY_TYPE_LABEL } from "@/lib/mockDb";
import type { Attendance, Employee, Expense } from "@/lib/mockDb";

/** كشف حساب موظف A4: الحضور والمستحقات والمدفوع والرصيد */
export function printEmployeeStatement(
  emp: Employee,
  result: PayrollResult,
  rows: Attendance[],
  payments: Expense[],
  range: { from?: string; to?: string },
  itemName: (id: string) => string,
) {
  const periodText =
    range.from || range.to
      ? `${range.from ? dateFmt(range.from) : "البداية"} — ${range.to ? dateFmt(range.to) : "حتى الآن"}`
      : "كل الفترات";

  const info = `<table class="kv">
    <tr><td>اسم الموظف</td><td>${emp.name}</td><td>الكود</td><td>${emp.code}</td></tr>
    <tr><td>الوظيفة</td><td>${emp.jobTitle || "—"}</td><td>القسم</td><td>${emp.department || "—"}</td></tr>
    <tr><td>نوع الأجر</td><td>${SALARY_TYPE_LABEL[emp.salaryType]}</td><td>${
      emp.salaryType === "monthly" ? "الراتب الشهرى" : "أجر اليوم"
    }</td><td>${money(emp.baseSalary)}</td></tr>
    <tr><td>تاريخ التعيين</td><td>${dateFmt(emp.hireDate)}</td><td>الفترة</td><td>${periodText}</td></tr>
  </table>`;

  const att = result.attendance;
  const summary = `<table class="kv">
    <tr><td>أيام الحضور</td><td>${num(att.present)}</td><td>أيام التأخير</td><td>${num(att.late)}</td></tr>
    <tr><td>أيام الغياب</td><td>${num(att.absent)}</td><td>الإجازات</td><td>${num(att.leave)}</td></tr>
    <tr><td>دقائق التأخير</td><td>${num(att.lateMinutes)}</td><td>ساعات إضافية</td><td>${num(att.overtimeHours)}</td></tr>
  </table>`;

  const calc = `<table>
    <thead><tr><th>البيان</th><th>القيمة</th></tr></thead>
    <tbody>
      <tr><td>أجر اليوم</td><td style="text-align:center">${money(result.dayRate)}</td></tr>
      <tr><td>أجر أيام العمل (${num(result.earnedDays)} يوم)</td><td style="text-align:center">${money(result.basicEarned)}</td></tr>
      <tr><td>أجر ساعات إضافية</td><td style="text-align:center">${money(result.overtimePay)}</td></tr>
      <tr><td>بدلات</td><td style="text-align:center">${money(result.allowances)}</td></tr>
      ${result.adjustments
        .map(
          (a) =>
            `<tr><td>${a.kind === "allowance" ? "بدل" : "خصم"}: ${a.label} (${a.month})</td><td style="text-align:center">${a.kind === "allowance" ? "" : "- "}${money(a.amount)}</td></tr>`,
        )
        .join("")}
      <tr><td>خصم تأخير</td><td style="text-align:center">- ${money(result.lateDeduction)}</td></tr>
      <tr><td>خصومات ثابتة</td><td style="text-align:center">- ${money(result.fixedDeductions)}</td></tr>
      <tr><td>سلف وعهد</td><td style="text-align:center">- ${money(result.advances)}</td></tr>
      <tr><td><b>صافى المستحق</b></td><td style="text-align:center"><b>${money(result.netDue)}</b></td></tr>
      <tr><td>المدفوع رواتب خلال الفترة</td><td style="text-align:center">${money(result.paidSalaries)}</td></tr>
    </tbody>
  </table>`;

  const payRows = payments.length
    ? payments
        .map(
          (p, i) => `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="text-align:center">${dateFmt(p.date)}</td>
      <td style="text-align:center">${p.no}</td>
      <td style="text-align:center">${EXPENSE_KIND_LABEL[p.kind]}</td>
      <td>${itemName(p.itemId)}</td>
      <td style="text-align:center">${num(p.amount)}</td>
      <td>${p.note || "—"}</td>
    </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center">لا توجد مدفوعات فى الفترة</td></tr>`;

  const attRows = rows.length
    ? rows
        .map(
          (r, i) => `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="text-align:center">${dateFmt(r.date)}</td>
      <td style="text-align:center">${ATTENDANCE_LABEL[r.status]}</td>
      <td style="text-align:center">${r.lateMinutes ? num(r.lateMinutes) : "—"}</td>
      <td style="text-align:center">${r.overtimeHours ? num(r.overtimeHours) : "—"}</td>
      <td>${r.note || "—"}</td>
    </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" style="text-align:center">لا يوجد حضور مسجل</td></tr>`;

  printHtml(
    `كشف حساب موظف — ${emp.name}`,
    `<h1>كشف حساب موظف ومستحقات</h1>
    ${info}
    <h1 style="font-size:14px">ملخص الحضور</h1>
    ${summary}
    <h1 style="font-size:14px">حساب المستحقات</h1>
    ${calc}
    <h1 style="font-size:14px">المدفوعات (رواتب وسلف)</h1>
    <table><thead><tr><th>#</th><th>التاريخ</th><th>رقم المستند</th><th>النوع</th><th>البند</th><th>المبلغ</th><th>ملاحظات</th></tr></thead>
    <tbody>${payRows}</tbody></table>
    <h1 style="font-size:14px">تفصيل الحضور والغياب</h1>
    <table><thead><tr><th>#</th><th>التاريخ</th><th>الحالة</th><th>دقائق تأخير</th><th>ساعات إضافية</th><th>ملاحظات</th></tr></thead>
    <tbody>${attRows}</tbody></table>
    <div class="tot">الرصيد المستحق للموظف: ${money(result.balance)}</div>
    <div class="sig"><div>الموظف</div><div>المحاسب</div><div>المدير</div></div>`,
  );
}
