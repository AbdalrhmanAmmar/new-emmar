import { useNavigate } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dateFmt, money, today } from "@/lib/format";
import { activeEmployees, activeExpenseItems } from "@/lib/hr";
import { saveExpense } from "@/lib/hrActions";
import {
  EXPENSE_KIND_LABEL,
  METHOD_LABEL,
  nextNo,
  useDb,
  type Expense,
  type ExpenseKind,
  type PayMethod,
} from "@/lib/mockDb";
import { printRecord } from "@/lib/printDoc";

interface Props {
  expense?: Expense;
}

const KINDS: ExpenseKind[] = ["general", "petty", "salary", "advance"];
const METHODS: PayMethod[] = ["cash", "transfer", "cheque", "wallet"];

/** صفحة تسجيل / تعديل مصروف */
export function ExpenseForm({ expense }: Props) {
  const data = useDb();
  const navigate = useNavigate();

  const [date, setDate] = useState(expense?.date ?? today());
  const [kind, setKind] = useState<ExpenseKind>(expense?.kind ?? "general");
  const [itemId, setItemId] = useState<string | null>(expense?.itemId ?? null);
  const [employeeId, setEmployeeId] = useState<string | null>(expense?.employeeId ?? null);
  const [beneficiary, setBeneficiary] = useState(expense?.beneficiary ?? "");
  const [amount, setAmount] = useState(String(expense?.amount ?? ""));
  const [branchId, setBranchId] = useState(expense?.branchId ?? data.branches[0]?.id ?? "");
  const [safeId, setSafeId] = useState<string | null>(expense?.safeId ?? data.safes[0]?.id ?? null);
  const [payMethod, setPayMethod] = useState<PayMethod>(expense?.payMethod ?? "cash");
  const [period, setPeriod] = useState(expense?.period ?? today().slice(0, 7));
  const [note, setNote] = useState(expense?.note ?? "");

  const no = useMemo(
    () => expense?.no ?? nextNo("EXP", data.expenses.map((e) => e.no)),
    [expense?.no, data.expenses],
  );

  const needsEmployee = kind === "salary" || kind === "advance";
  const employee = data.employees.find((e) => e.id === employeeId);

  const itemOptions = activeExpenseItems(data).map((i) => ({
    value: i.id,
    label: i.name,
    hint: `${i.code}${i.group ? ` • ${i.group}` : ""}`,
  }));
  const employeeOptions = activeEmployees(data).map((e) => ({
    value: e.id,
    label: e.name,
    hint: `${e.code} • ${e.jobTitle}`,
  }));

  const submit = (status: Expense["status"] = "posted") => {
    const res = saveExpense({
      id: expense?.id,
      no,
      date,
      itemId: itemId ?? "",
      kind,
      employeeId: needsEmployee ? employeeId : employeeId,
      beneficiary,
      amount: Number(amount || 0),
      branchId,
      safeId,
      payMethod,
      period,
      note,
      status,
    });
    if (!res.ok) return toast.error(res.error ?? "تعذر الحفظ");
    toast.success(expense ? "تم تعديل المصروف" : "تم تسجيل المصروف");
    navigate({ to: "/expenses/list" });
  };

  const print = () => {
    printRecord(
      `مستند صرف ${no}`,
      [
        ["رقم المستند", no],
        ["التاريخ", dateFmt(date)],
        ["نوع المصروف", EXPENSE_KIND_LABEL[kind]],
        ["بند الصرف", data.expenseItems.find((i) => i.id === itemId)?.name ?? "—"],
        ["المستفيد", employee?.name || beneficiary || "—"],
        ["الفرع", data.branches.find((b) => b.id === branchId)?.name ?? "—"],
        ["الخزينة", data.safes.find((s) => s.id === safeId)?.name ?? "—"],
        ["طريقة الدفع", METHOD_LABEL[payMethod]],
        ["شهر الاستحقاق", period || "—"],
        ["ملاحظات", note || "—"],
      ],
      undefined,
      `المبلغ المنصرف: ${money(Number(amount || 0))}`,
    );
  };

  return (
    <FormPage
      title={expense ? `تعديل مصروف ${expense.no}` : "تسجيل مصروف جديد"}
      subtitle="مصروفات عامة ونثريات ورواتب وسلف الموظفين"
      onCancel={() => navigate({ to: "/expenses/list" })}
      onSubmit={() => submit("posted")}
      submitLabel="حفظ وترحيل"
      extraActions={
        <>
          <Button type="button" variant="outline" className="gap-1.5" onClick={print}>
            <Printer className="size-4" />
            طباعة
          </Button>
          <Button type="button" variant="ghost" onClick={() => submit("draft")}>
            حفظ كمسودة
          </Button>
        </>
      }
    >
      <FormSection title="بيانات المستند">
        <Field label="رقم المستند">
          <Input value={no} readOnly className="bg-muted/40" />
        </Field>
        <Field label="التاريخ">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="نوع المصروف">
          <SearchSelect
            options={KINDS.map((k) => ({ value: k, label: EXPENSE_KIND_LABEL[k] }))}
            value={kind}
            onChange={(v) => setKind(v as ExpenseKind)}
          />
        </Field>
        <Field label="بند الصرف" hint="من شاشة تكويد بنود الصرف">
          <SearchSelect options={itemOptions} value={itemId} onChange={setItemId} placeholder="اختر البند..." />
        </Field>
        <Field label="الفرع">
          <SearchSelect
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchId}
            onChange={setBranchId}
          />
        </Field>
        <Field label="شهر الاستحقاق" hint="مهم لحساب رواتب الشهر">
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title="المستفيد">
        <Field
          label="الموظف"
          hint={needsEmployee ? "مطلوب للرواتب والسلف" : "اختيارى — لربط المصروف بموظف"}
        >
          <SearchSelect
            options={[{ value: "", label: "بدون موظف" }, ...employeeOptions]}
            value={employeeId ?? ""}
            onChange={(v) => setEmployeeId(v || null)}
            placeholder="اختر الموظف..."
          />
        </Field>
        <Field label="اسم المستفيد" hint="لو المصروف لجهة خارجية">
          <Input
            dir="rtl"
            value={employee?.name ?? beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            disabled={Boolean(employee)}
            placeholder="مثال: شركة الكهرباء"
          />
        </Field>
        {employee ? (
          <Field label="بيانات الموظف">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
              {employee.jobTitle} • {employee.department} •{" "}
              {employee.salaryType === "monthly" ? "راتب شهرى" : "أجر يومى"} {money(employee.baseSalary)}
            </div>
          </Field>
        ) : null}
      </FormSection>

      <FormSection title="المبلغ والسداد">
        <Field label="المبلغ">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="طريقة الدفع">
          <SearchSelect
            options={METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))}
            value={payMethod}
            onChange={(v) => setPayMethod(v as PayMethod)}
          />
        </Field>
        <Field label="الخزينة / الحساب">
          <SearchSelect
            options={data.safes.map((s) => ({ value: s.id, label: s.name, hint: s.code }))}
            value={safeId}
            onChange={setSafeId}
          />
        </Field>
        <Field label="ملاحظات" className="sm:col-span-2 lg:col-span-3">
          <Textarea dir="rtl" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
      </FormSection>
    </FormPage>
  );
}
