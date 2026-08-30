import { useNavigate } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Power, Trash2, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { dateFmt, money } from "@/lib/format";
import { currentMonth, monthRange, payroll } from "@/lib/hr";
import { deleteEmployee, saveEmployee } from "@/lib/hrActions";
import { SALARY_TYPE_LABEL, useDb, type Employee } from "@/lib/mockDb";

/** قائمة الموظفين مع مستحقات الشهر الحالى */
export function EmployeesPage() {
  const data = useDb();
  const navigate = useNavigate();
  const [dept, setDept] = useState("");
  const [month, setMonth] = useState(currentMonth());

  const range = monthRange(month);
  const departments = Array.from(new Set(data.employees.map((e) => e.department).filter(Boolean)));

  const rows = data.employees.filter((e) => (dept ? e.department === dept : true));

  const totals = rows.reduce(
    (acc, e) => {
      const p = payroll(data, e, range);
      acc.due += p.netDue;
      acc.paid += p.paidSalaries;
      acc.balance += p.balance;
      return acc;
    },
    { due: 0, paid: 0, balance: 0 },
  );

  const toggle = (row: Employee) => {
    const res = saveEmployee({ ...row, active: !row.active });
    if (!res.ok) return toast.error(res.error ?? "تعذر التعديل");
    toast.success(row.active ? "تم إيقاف الموظف" : "تم تنشيط الموظف");
  };

  const remove = (row: Employee) => {
    const res = deleteEmployee(row.id);
    if (!res.ok) return toast.error(res.error ?? "تعذر الحذف");
    toast.success("تم حذف الموظف");
  };

  const columns: Array<Column<Employee>> = [
    { key: "code", header: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "اسم الموظف", cell: (r) => r.name, text: (r) => r.name },
    { key: "job", header: "الوظيفة", cell: (r) => r.jobTitle || "—", text: (r) => r.jobTitle },
    { key: "dept", header: "القسم", cell: (r) => r.department || "—", text: (r) => r.department },
    { key: "phone", header: "الهاتف", cell: (r) => r.phone || "—", text: (r) => r.phone },
    {
      key: "salaryType",
      header: "نوع الأجر",
      align: "center",
      cell: (r) => SALARY_TYPE_LABEL[r.salaryType],
      text: (r) => SALARY_TYPE_LABEL[r.salaryType],
    },
    { key: "base", header: "الأجر الأساسى", cell: (r) => money(r.baseSalary) },
    { key: "hire", header: "تاريخ التعيين", align: "center", cell: (r) => dateFmt(r.hireDate) },
    {
      key: "due",
      header: "مستحق الشهر",
      cell: (r) => money(payroll(data, r, range).netDue),
    },
    {
      key: "paid",
      header: "المدفوع",
      cell: (r) => money(payroll(data, r, range).paidSalaries),
    },
    {
      key: "balance",
      header: "المتبقى",
      cell: (r) => {
        const b = payroll(data, r, range).balance;
        return <span className={b > 0 ? "font-semibold text-destructive" : ""}>{money(b)}</span>;
      },
    },
    {
      key: "active",
      header: "الحالة",
      align: "center",
      cell: (r) => <StatusBadge label={r.active ? "على العمل" : "موقوف"} tone={r.active ? "green" : "gray"} />,
      text: (r) => (r.active ? "على العمل" : "موقوف"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="الموظفون"
        description="تكويد الموظفين وبياناتهم وأجورهم ومستحقاتهم الشهرية"
        actions={
          <Button className="gap-1.5" onClick={() => navigate({ to: "/hr/employees/new" })}>
            <Plus className="size-4" />
            موظف جديد
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد الموظفين" value={String(rows.length)} icon={<Users className="size-4" />} />
        <StatCard label="مستحقات الشهر" value={money(totals.due)} tone="accent" icon={<Wallet className="size-4" />} />
        <StatCard label="المدفوع للموظفين" value={money(totals.paid)} />
        <StatCard label="المتبقى عليهم" value={money(totals.balance)} tone="danger" />
      </div>

      <DataTable
        title="سجل الموظفين"
        data={rows}
        columns={columns}
        rowId={(r) => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <SearchSelect
                options={[{ value: "", label: "كل الأقسام" }, ...departments.map((d) => ({ value: d, label: d }))]}
                value={dept}
                onChange={setDept}
              />
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
        }
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "ملف الموظف",
                icon: <Eye className="size-4" />,
                onSelect: () => navigate({ to: "/hr/employees/$id", params: { id: row.id } }),
              },
              {
                label: "تعديل البيانات",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/hr/employees/$id/edit", params: { id: row.id } }),
              },
              {
                label: row.active ? "إيقاف" : "تنشيط",
                icon: <Power className="size-4" />,
                onSelect: () => toggle(row),
              },
              { label: "حذف", icon: <Trash2 className="size-4" />, danger: true, onSelect: () => remove(row) },
            ]}
          />
        )}
      />
    </div>
  );
}
