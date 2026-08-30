import { useNavigate } from "@tanstack/react-router";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { useDb, type Party } from "@/lib/mockDb";
import { customerStats } from "@/lib/sales";
import { deleteCustomer, saveCustomer } from "@/lib/salesActions";

export function CustomersPage() {
  const data = useDb();
  const navigate = useNavigate();

  const totals = data.customers.reduce(
    (acc, c) => {
      const s = customerStats(data, c.id);
      acc.sales += s.sales;
      acc.debt += s.debt;
      return acc;
    },
    { sales: 0, debt: 0 },
  );

  const columns: Array<Column<Party>> = [
    { key: "code", header: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "اسم العميل", cell: (r) => r.name, text: (r) => r.name },
    { key: "phone", header: "الهاتف", cell: (r) => r.phone, text: (r) => r.phone },
    {
      key: "branch",
      header: "الفرع",
      cell: (r) => data.branches.find((b) => b.id === r.branchId)?.name ?? "-",
      text: (r) => data.branches.find((b) => b.id === r.branchId)?.name ?? "",
    },
    {
      key: "count",
      header: "عدد الفواتير",
      align: "center",
      cell: (r) => customerStats(data, r.id).count,
    },
    { key: "sales", header: "إجمالي المبيعات", cell: (r) => money(customerStats(data, r.id).sales) },
    {
      key: "debt",
      header: "الرصيد المستحق",
      cell: (r) => {
        const debt = customerStats(data, r.id).debt;
        return <span className={debt > 0 ? "font-semibold text-destructive" : ""}>{money(debt)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="العملاء"
        description="بيانات العملاء وأرصدتهم ومبيعاتهم"
        actions={
          <Button className="gap-1.5" onClick={() => navigate({ to: "/sales/customers/new" })}>
            <Plus className="size-4" />
            عميل جديد
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="عدد العملاء" value={String(data.customers.length)} />
        <StatCard label="إجمالي المبيعات" value={money(totals.sales)} tone="accent" />
        <StatCard label="إجمالي المديونية" value={money(totals.debt)} tone="danger" />
      </div>

      <DataTable
        title="العملاء"
        data={data.customers}
        columns={columns}
        rowId={(r) => r.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/sales/customers/$id", params: { id: row.id } }),
              },
              {
                label: "فاتورة جديدة",
                icon: <FileText className="size-4" />,
                onSelect: () => navigate({ to: "/sales/invoices/new" }),
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const res = deleteCustomer(row.id);
                  res.ok ? toast.success("تم حذف العميل") : toast.error(res.error ?? "خطأ");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}

export function CustomerFormPage({ id }: { id?: string }) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = id ? data.customers.find((c) => c.id === id) : undefined;

  const [form, setForm] = useState({
    code: existing?.code ?? nextCode("CU", data.customers.map((c) => c.code)),
    name: existing?.name ?? "",
    phone: existing?.phone ?? "",
    branchId: existing?.branchId ?? data.branches[0]?.id ?? "",
  });
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const res = saveCustomer({ ...(existing ? { id: existing.id } : {}), ...form });
    if (!res.ok) {
      toast.error(res.error ?? "تعذر الحفظ");
      return;
    }
    toast.success(existing ? "تم تعديل بيانات العميل" : "تم إضافة العميل");
    navigate({ to: "/sales/customers" });
  };

  return (
    <FormPage
      title={existing ? `تعديل العميل ${existing.name}` : "إضافة عميل جديد"}
      subtitle="بيانات العميل الأساسية"
      onCancel={() => navigate({ to: "/sales/customers" })}
      onSubmit={submit}
    >
      <FormSection title="بيانات العميل">
        <Field label="كود العميل" hint="يتم توليده تلقائياً">
          <Input dir="rtl" value={form.code} readOnly className="bg-muted/50" />
        </Field>
        <Field label="اسم العميل">
          <Input dir="rtl" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="رقم الهاتف">
          <Input dir="rtl" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="الفرع">
          <SearchSelect
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            value={form.branchId}
            onChange={(v) => set("branchId", v)}
          />
        </Field>
      </FormSection>
    </FormPage>
  );
}
