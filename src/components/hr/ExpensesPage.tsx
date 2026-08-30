import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateFmt, money } from "@/lib/format";
import { employeeName, expenseItemName, inPeriod } from "@/lib/hr";
import { deleteExpense } from "@/lib/hrActions";
import {
  EXPENSE_KIND_LABEL,
  METHOD_LABEL,
  STATUS_LABEL,
  useDb,
  type Expense,
  type ExpenseKind,
} from "@/lib/mockDb";
import { printRecord } from "@/lib/printDoc";

const KIND_TONE: Record<ExpenseKind, "green" | "gold" | "red" | "gray"> = {
  general: "green",
  petty: "gold",
  salary: "gray",
  advance: "red",
};

/** سجل المصروفات العامة والنثريات */
export function ExpensesPage() {
  const data = useDb();
  const navigate = useNavigate();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState("");
  const [itemId, setItemId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const rows = data.expenses
    .filter((e) => inPeriod(e.date, { from: from || undefined, to: to || undefined }))
    .filter((e) => (kind ? e.kind === kind : true))
    .filter((e) => (itemId ? e.itemId === itemId : true))
    .filter((e) => (employeeId ? e.employeeId === employeeId : true))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const total = rows.filter((e) => e.status !== "cancelled").reduce((a, e) => a + e.amount, 0);
  const salaries = rows.filter((e) => e.kind === "salary").reduce((a, e) => a + e.amount, 0);
  const petty = rows.filter((e) => e.kind === "petty").reduce((a, e) => a + e.amount, 0);

  const print = (row: Expense) =>
    printRecord(
      `مستند صرف ${row.no}`,
      [
        ["رقم المستند", row.no],
        ["التاريخ", dateFmt(row.date)],
        ["النوع", EXPENSE_KIND_LABEL[row.kind]],
        ["بند الصرف", expenseItemName(data, row.itemId)],
        ["المستفيد", row.employeeId ? employeeName(data, row.employeeId) : row.beneficiary || "—"],
        ["الفرع", data.branches.find((b) => b.id === row.branchId)?.name ?? "—"],
        ["الخزينة", data.safes.find((s) => s.id === row.safeId)?.name ?? "—"],
        ["طريقة الدفع", METHOD_LABEL[row.payMethod]],
        ["ملاحظات", row.note || "—"],
      ],
      undefined,
      `المبلغ المنصرف: ${money(row.amount)}`,
    );

  const remove = (row: Expense) => {
    deleteExpense(row.id);
    toast.success("تم حذف المصروف");
  };

  const columns: Array<Column<Expense>> = [
    { key: "no", header: "رقم المستند", cell: (r) => r.no, text: (r) => r.no },
    { key: "date", header: "التاريخ", align: "center", cell: (r) => dateFmt(r.date), text: (r) => r.date },
    {
      key: "kind",
      header: "النوع",
      align: "center",
      cell: (r) => <StatusBadge label={EXPENSE_KIND_LABEL[r.kind]} tone={KIND_TONE[r.kind]} />,
      text: (r) => EXPENSE_KIND_LABEL[r.kind],
    },
    {
      key: "item",
      header: "بند الصرف",
      cell: (r) => expenseItemName(data, r.itemId),
      text: (r) => expenseItemName(data, r.itemId),
    },
    {
      key: "who",
      header: "المستفيد",
      cell: (r) => (r.employeeId ? employeeName(data, r.employeeId) : r.beneficiary || "—"),
      text: (r) => (r.employeeId ? employeeName(data, r.employeeId) : r.beneficiary),
    },
    { key: "amount", header: "المبلغ", cell: (r) => money(r.amount), text: (r) => String(r.amount) },
    {
      key: "method",
      header: "طريقة الدفع",
      align: "center",
      cell: (r) => METHOD_LABEL[r.payMethod],
      text: (r) => METHOD_LABEL[r.payMethod],
    },
    {
      key: "safe",
      header: "الخزينة",
      cell: (r) => data.safes.find((s) => s.id === r.safeId)?.name ?? "—",
      text: (r) => data.safes.find((s) => s.id === r.safeId)?.name ?? "",
    },
    {
      key: "status",
      header: "الحالة",
      align: "center",
      cell: (r) => (
        <StatusBadge
          label={STATUS_LABEL[r.status]}
          tone={r.status === "posted" ? "green" : r.status === "draft" ? "gold" : "red"}
        />
      ),
      text: (r) => STATUS_LABEL[r.status],
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="المصروفات العامة والنثريات"
        description="كل حركات الصرف بالبنود والمستفيدين والربط بالموظفين"
        actions={
          <Button className="gap-1.5" onClick={() => navigate({ to: "/expenses/new" })}>
            <Plus className="size-4" />
            مصروف جديد
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="إجمالى المصروفات (بالفلتر)" value={money(total)} tone="danger" />
        <StatCard label="منها رواتب وأجور" value={money(salaries)} />
        <StatCard label="منها نثريات" value={money(petty)} tone="accent" />
      </div>

      <DataTable
        title="سجل المصروفات"
        data={rows}
        columns={columns}
        rowId={(r) => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" />
            <div className="w-40">
              <SearchSelect
                options={[
                  { value: "", label: "كل الأنواع" },
                  ...(Object.keys(EXPENSE_KIND_LABEL) as ExpenseKind[]).map((k) => ({
                    value: k,
                    label: EXPENSE_KIND_LABEL[k],
                  })),
                ]}
                value={kind}
                onChange={setKind}
              />
            </div>
            <div className="w-44">
              <SearchSelect
                options={[
                  { value: "", label: "كل البنود" },
                  ...data.expenseItems.map((i) => ({ value: i.id, label: i.name, hint: i.code })),
                ]}
                value={itemId}
                onChange={setItemId}
              />
            </div>
            <div className="w-44">
              <SearchSelect
                options={[
                  { value: "", label: "كل الموظفين" },
                  ...data.employees.map((e) => ({ value: e.id, label: e.name, hint: e.code })),
                ]}
                value={employeeId}
                onChange={setEmployeeId}
              />
            </div>
          </div>
        }
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/expenses/$id", params: { id: row.id } }),
              },
              { label: "طباعة المستند", icon: <Printer className="size-4" />, onSelect: () => print(row) },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => remove(row),
              },
            ]}
          />
        )}
      />
    </div>
  );
}
