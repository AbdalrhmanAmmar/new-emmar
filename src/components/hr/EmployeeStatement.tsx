import { Printer } from "lucide-react";
import { useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dateFmt, money, num } from "@/lib/format";
import {
  ATTENDANCE_TONE,
  currentMonth,
  employeeAttendance,
  employeeExpenses,
  expenseItemName,
  monthRange,
  payroll,
} from "@/lib/hr";
import { ATTENDANCE_LABEL, EXPENSE_KIND_LABEL, SALARY_TYPE_LABEL, useDb, type Attendance, type Expense } from "@/lib/mockDb";
import { printEmployeeStatement } from "@/lib/printEmployee";

/** كشف حساب موظف: الحضور والمستحقات والمدفوع والرصيد */
export function EmployeeStatement({ employeeId: fixedId }: { employeeId?: string }) {
  const data = useDb();
  const [employeeId, setEmployeeId] = useState(fixedId ?? data.employees[0]?.id ?? "");
  const [month, setMonth] = useState(currentMonth());
  const [useMonth, setUseMonth] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const range = useMonth ? monthRange(month) : { from: from || undefined, to: to || undefined };
  const employee = data.employees.find((e) => e.id === employeeId);

  if (!employee) {
    return <p className="p-6 text-sm text-muted-foreground">لا يوجد موظفون بعد — أضف موظفًا أولاً.</p>;
  }

  const result = payroll(data, employee, range);
  const attRows = employeeAttendance(data, employee.id, range);
  const payments = employeeExpenses(data, employee.id, range);

  const attColumns: Array<Column<Attendance>> = [
    { key: "date", header: "التاريخ", align: "center", cell: (r) => dateFmt(r.date), text: (r) => r.date },
    {
      key: "status",
      header: "الحالة",
      align: "center",
      cell: (r) => <StatusBadge label={ATTENDANCE_LABEL[r.status]} tone={ATTENDANCE_TONE[r.status]} />,
      text: (r) => ATTENDANCE_LABEL[r.status],
    },
    { key: "late", header: "تأخير (دقيقة)", align: "center", cell: (r) => num(r.lateMinutes) },
    { key: "ot", header: "إضافى (ساعة)", align: "center", cell: (r) => num(r.overtimeHours) },
    { key: "note", header: "ملاحظات", cell: (r) => r.note || "—", text: (r) => r.note },
  ];

  const payColumns: Array<Column<Expense>> = [
    { key: "no", header: "المستند", cell: (r) => r.no, text: (r) => r.no },
    { key: "date", header: "التاريخ", align: "center", cell: (r) => dateFmt(r.date), text: (r) => r.date },
    {
      key: "kind",
      header: "النوع",
      align: "center",
      cell: (r) => EXPENSE_KIND_LABEL[r.kind],
      text: (r) => EXPENSE_KIND_LABEL[r.kind],
    },
    { key: "item", header: "البند", cell: (r) => expenseItemName(data, r.itemId) },
    { key: "amount", header: "المبلغ", cell: (r) => money(r.amount) },
    { key: "note", header: "ملاحظات", cell: (r) => r.note || "—", text: (r) => r.note },
  ];

  const lines: Array<[string, number]> = [
    ["أجر اليوم", result.dayRate],
    ["أجر الأيام المستحقة", result.basicEarned],
    ["أجر الساعات الإضافية", result.overtimePay],
    ["البدلات", result.allowances],
    ["خصم التأخير", -result.lateDeduction],
    ["الخصومات الثابتة", -result.fixedDeductions],
    ["السلف والعهد", -result.advances],
    ["صافى المستحق", result.netDue],
    ["المدفوع فعليًا", -result.paidSalaries],
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="كشف حساب موظف"
        description="الحضور والمستحقات والمدفوع والرصيد المتبقى — قابل للطباعة A4"
        actions={
          <Button
            className="gap-1.5"
            onClick={() =>
              printEmployeeStatement(employee, result, attRows, payments, range, (id) => expenseItemName(data, id))
            }
          >
            <Printer className="size-4" />
            طباعة الكشف
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">فلترة الكشف</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          {!fixedId ? (
            <div className="w-56 space-y-1">
              <span className="text-xs text-muted-foreground">الموظف</span>
              <SearchSelect
                options={data.employees.map((e) => ({ value: e.id, label: e.name, hint: `${e.code} • ${e.jobTitle}` }))}
                value={employeeId}
                onChange={setEmployeeId}
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">الشهر</span>
            <Input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setUseMonth(true);
              }}
              className="h-9 w-40"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">من تاريخ</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setUseMonth(false);
              }}
              className="h-9 w-36"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">إلى تاريخ</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setUseMonth(false);
              }}
              className="h-9 w-36"
            />
          </div>
          <Button variant="outline" onClick={() => setUseMonth((v) => !v)}>
            {useMonth ? "استخدام الفترة المخصصة" : "استخدام الشهر"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="الموظف"
          value={employee.name}
          hint={`${employee.code} • ${SALARY_TYPE_LABEL[employee.salaryType]} ${money(employee.baseSalary)}`}
        />
        <StatCard label="صافى المستحق" value={money(result.netDue)} tone="accent" />
        <StatCard label="المدفوع" value={money(result.paidSalaries)} />
        <StatCard
          label="الرصيد المتبقى"
          value={money(result.balance)}
          tone={result.balance > 0 ? "danger" : "primary"}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">تفاصيل الاستحقاق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {lines.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-dashed border-border/60 py-1.5 text-sm last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className={value < 0 ? "font-semibold text-destructive" : "font-semibold"}>{money(value)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-md bg-primary/10 px-3 py-2 text-sm font-bold">
              <span>الرصيد المتبقى للموظف</span>
              <span>{money(result.balance)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">ملخص الحضور</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {[
              ["حضور", result.attendance.present],
              ["تأخير", result.attendance.late],
              ["غياب", result.attendance.absent],
              ["إجازة", result.attendance.leave],
              ["عطلة", result.attendance.holiday],
              ["أيام مدفوعة", result.attendance.paidDays],
              ["دقائق تأخير", result.attendance.lateMinutes],
              ["ساعات إضافية", result.attendance.overtimeHours],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-semibold">{num(Number(value))}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <DataTable title="سجل الحضور" data={attRows} columns={attColumns} rowId={(r) => r.id} />
      <DataTable title="المدفوعات والسلف" data={payments} columns={payColumns} rowId={(r) => r.id} />
    </div>
  );
}
