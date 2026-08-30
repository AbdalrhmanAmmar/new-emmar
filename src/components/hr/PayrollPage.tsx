import { useNavigate } from "@tanstack/react-router";
import { Printer, Wallet } from "lucide-react";
import { useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, num } from "@/lib/format";
import { currentMonth, employeeAttendance, employeeExpenses, expenseItemName, monthRange, payroll } from "@/lib/hr";
import { SALARY_TYPE_LABEL, useDb, type Employee } from "@/lib/mockDb";
import { printEmployeeStatement } from "@/lib/printEmployee";
import { printRecord } from "@/lib/printDoc";

/** مسير الرواتب الشهرى: مستحقات كل الموظفين فى شهر */
export function PayrollPage() {
  const data = useDb();
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const range = monthRange(month);

  const rows = data.employees.filter((e) => e.active);
  const calc = (emp: Employee) => payroll(data, emp, range);

  const totals = rows.reduce(
    (acc, e) => {
      const p = calc(e);
      acc.earned += p.basicEarned + p.overtimePay + p.allowances;
      acc.deductions += p.lateDeduction + p.fixedDeductions;
      acc.advances += p.advances;
      acc.net += p.netDue;
      acc.paid += p.paidSalaries;
      acc.balance += p.balance;
      return acc;
    },
    { earned: 0, deductions: 0, advances: 0, net: 0, paid: 0, balance: 0 },
  );

  const columns: Array<Column<Employee>> = [
    { key: "code", header: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "الموظف", cell: (r) => r.name, text: (r) => r.name },
    {
      key: "type",
      header: "نوع الأجر",
      align: "center",
      cell: (r) => SALARY_TYPE_LABEL[r.salaryType],
      text: (r) => SALARY_TYPE_LABEL[r.salaryType],
    },
    { key: "dayRate", header: "أجر اليوم", cell: (r) => money(calc(r).dayRate) },
    { key: "days", header: "أيام مدفوعة", align: "center", cell: (r) => num(calc(r).earnedDays) },
    { key: "basic", header: "أجر الأيام", cell: (r) => money(calc(r).basicEarned) },
    { key: "ot", header: "إضافى", cell: (r) => money(calc(r).overtimePay) },
    { key: "allow", header: "بدلات", cell: (r) => money(calc(r).allowances) },
    {
      key: "ded",
      header: "خصومات",
      cell: (r) => money(calc(r).lateDeduction + calc(r).fixedDeductions),
    },
    { key: "adv", header: "سلف", cell: (r) => money(calc(r).advances) },
    { key: "net", header: "صافى المستحق", cell: (r) => <span className="font-semibold">{money(calc(r).netDue)}</span> },
    { key: "paid", header: "المدفوع", cell: (r) => money(calc(r).paidSalaries) },
    {
      key: "balance",
      header: "المتبقى",
      cell: (r) => {
        const b = calc(r).balance;
        return <span className={b > 0 ? "font-semibold text-destructive" : ""}>{money(b)}</span>;
      },
    },
  ];

  const printSheet = () =>
    printRecord(
      `مسير رواتب شهر ${month}`,
      [
        ["الشهر", month],
        ["عدد الموظفين", num(rows.length)],
        ["إجمالى المستحق", money(totals.net)],
        ["إجمالى المدفوع", money(totals.paid)],
      ],
      {
        headers: ["الكود", "الموظف", "أيام", "مستحق", "مدفوع", "متبقى"],
        rows: rows.map((e) => {
          const p = calc(e);
          return [e.code, e.name, num(p.earnedDays), money(p.netDue), money(p.paidSalaries), money(p.balance)];
        }),
      },
      `إجمالى المتبقى للموظفين: ${money(totals.balance)}`,
    );

  return (
    <div className="space-y-4">
      <PageHeader
        title="مسير الرواتب"
        description="مستحقات كل الموظفين فى الشهر بناءً على التحضير والبدلات والخصومات والسلف"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-40" />
            <Button variant="outline" className="gap-1.5" onClick={printSheet}>
              <Printer className="size-4" />
              طباعة المسير
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالى الاستحقاق" value={money(totals.earned)} icon={<Wallet className="size-4" />} />
        <StatCard label="الخصومات والسلف" value={money(totals.deductions + totals.advances)} tone="accent" />
        <StatCard label="صافى المستحق" value={money(totals.net)} />
        <StatCard label="المتبقى بعد المدفوع" value={money(totals.balance)} tone="danger" />
      </div>

      <DataTable
        title={`مسير رواتب ${month}`}
        data={rows}
        columns={columns}
        rowId={(r) => r.id}
        footerNote={`صافى المستحق: ${money(totals.net)} — المدفوع: ${money(totals.paid)} — المتبقى: ${money(totals.balance)}`}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "صرف راتب",
                icon: <Wallet className="size-4" />,
                onSelect: () => navigate({ to: "/expenses/new" }),
              },
              {
                label: "طباعة كشف الموظف",
                icon: <Printer className="size-4" />,
                onSelect: () =>
                  printEmployeeStatement(
                    row,
                    calc(row),
                    employeeAttendance(data, row.id, range),
                    employeeExpenses(data, row.id, range),
                    range,
                    (id) => expenseItemName(data, id),
                  ),
              },
            ]}
          />
        )}
      />
    </div>
  );
}
