import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { money, today } from "@/lib/format";
import { saveEmployee } from "@/lib/hrActions";
import { SALARY_TYPE_LABEL, nextCode, useDb, type Employee, type SalaryType } from "@/lib/mockDb";

const DEPARTMENTS = ["المخازن", "المبيعات", "المشتريات", "النقل", "الحسابات", "الإدارة", "الإنتاج"];

/** إضافة / تعديل موظف */
export function EmployeeForm({ employee }: { employee?: Employee }) {
  const data = useDb();
  const navigate = useNavigate();

  const code = useMemo(
    () => employee?.code ?? nextCode("EMP", data.employees.map((e) => e.code)),
    [employee?.code, data.employees],
  );

  const [form, setForm] = useState({
    code,
    name: employee?.name ?? "",
    jobTitle: employee?.jobTitle ?? "",
    department: employee?.department ?? DEPARTMENTS[0],
    phone: employee?.phone ?? "",
    nationalId: employee?.nationalId ?? "",
    hireDate: employee?.hireDate ?? today(),
    branchId: employee?.branchId ?? data.branches[0]?.id ?? "",
    salaryType: (employee?.salaryType ?? "monthly") as SalaryType,
    baseSalary: String(employee?.baseSalary ?? ""),
    workDays: String(employee?.workDays ?? 26),
    allowances: String(employee?.allowances ?? 0),
    deductions: String(employee?.deductions ?? 0),
    active: employee?.active ?? true,
    note: employee?.note ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const base = Number(form.baseSalary || 0);
  const days = Math.max(1, Number(form.workDays || 26));
  const dayRate = form.salaryType === "monthly" ? base / days : base;

  const submit = () => {
    const res = saveEmployee({
      id: employee?.id,
      code: form.code,
      name: form.name,
      jobTitle: form.jobTitle,
      department: form.department,
      phone: form.phone,
      nationalId: form.nationalId,
      hireDate: form.hireDate,
      branchId: form.branchId,
      salaryType: form.salaryType,
      baseSalary: base,
      workDays: days,
      allowances: Number(form.allowances || 0),
      deductions: Number(form.deductions || 0),
      active: form.active,
      note: form.note,
    });
    if (!res.ok) return toast.error(res.error ?? "تعذر الحفظ");
    toast.success(employee ? "تم تعديل بيانات الموظف" : "تمت إضافة الموظف");
    navigate({ to: "/hr/employees" });
  };

  return (
    <FormPage
      title={employee ? `تعديل بيانات ${employee.name}` : "موظف جديد"}
      subtitle="تكويد الموظف وبيانات الأجر والبدلات والخصومات"
      onCancel={() => navigate({ to: "/hr/employees" })}
      onSubmit={submit}
      submitLabel="حفظ الموظف"
    >
      <FormSection title="البيانات الأساسية">
        <Field label="الكود">
          <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
        </Field>
        <Field label="اسم الموظف">
          <Input dir="rtl" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="الوظيفة">
          <Input dir="rtl" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
        </Field>
        <Field label="القسم">
          <SearchSelect
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            value={form.department}
            onChange={(v) => set("department", v)}
          />
        </Field>
        <Field label="الفرع">
          <SearchSelect
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            value={form.branchId}
            onChange={(v) => set("branchId", v)}
          />
        </Field>
        <Field label="تاريخ التعيين">
          <Input type="date" value={form.hireDate} onChange={(e) => set("hireDate", e.target.value)} />
        </Field>
        <Field label="رقم الهاتف">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="الرقم القومى">
          <Input value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} />
        </Field>
        <Field label="الحالة">
          <SearchSelect
            options={[
              { value: "1", label: "على العمل" },
              { value: "0", label: "موقوف" },
            ]}
            value={form.active ? "1" : "0"}
            onChange={(v) => set("active", v === "1")}
          />
        </Field>
      </FormSection>

      <FormSection title="الأجر والبدلات">
        <Field label="نوع الأجر">
          <SearchSelect
            options={(["monthly", "daily"] as SalaryType[]).map((t) => ({ value: t, label: SALARY_TYPE_LABEL[t] }))}
            value={form.salaryType}
            onChange={(v) => set("salaryType", v as SalaryType)}
          />
        </Field>
        <Field label={form.salaryType === "monthly" ? "الراتب الشهرى" : "أجر اليوم"}>
          <Input type="number" value={form.baseSalary} onChange={(e) => set("baseSalary", e.target.value)} />
        </Field>
        <Field label="أيام العمل بالشهر" hint="تُستخدم لحساب أجر اليوم والخصومات">
          <Input type="number" value={form.workDays} onChange={(e) => set("workDays", e.target.value)} />
        </Field>
        <Field label="بدلات شهرية">
          <Input type="number" value={form.allowances} onChange={(e) => set("allowances", e.target.value)} />
        </Field>
        <Field label="خصومات ثابتة">
          <Input type="number" value={form.deductions} onChange={(e) => set("deductions", e.target.value)} />
        </Field>
        <Field label="أجر اليوم المحتسب">
          <div className="flex h-9 items-center rounded-md border border-border bg-muted/30 px-3 text-sm font-semibold">
            {money(dayRate)}
          </div>
        </Field>
        <Field label="ملاحظات" className="sm:col-span-2 lg:col-span-3">
          <Textarea dir="rtl" rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} />
        </Field>
      </FormSection>
    </FormPage>
  );
}
