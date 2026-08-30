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
import { nextCode, useDb, type Party } from "@/lib/mockDb";
import { deleteSupplier, saveSupplier } from "@/lib/purchaseActions";
import { supplierStats } from "@/lib/purchases";

export function SuppliersPage() {
  const data = useDb();
  const navigate = useNavigate();

  const totals = data.suppliers.reduce(
    (acc, s) => {
      const st = supplierStats(data, s.id);
      acc.purchases += st.purchases;
      acc.debt += st.debt;
      return acc;
    },
    { purchases: 0, debt: 0 },
  );

  const columns: Array<Column<Party>> = [
    { key: "code", header: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "اسم المورد", cell: (r) => r.name, text: (r) => r.name },
    { key: "phone", header: "الهاتف", cell: (r) => r.phone, text: (r) => r.phone },
    {
      key: "branch",
      header: "الفرع",
      cell: (r) => data.branches.find((b) => b.id === r.branchId)?.name ?? "-",
      text: (r) => data.branches.find((b) => b.id === r.branchId)?.name ?? "",
    },
    { key: "count", header: "عدد الفواتير", align: "center", cell: (r) => supplierStats(data, r.id).count },
    { key: "purchases", header: "إجمالي المشتريات", cell: (r) => money(supplierStats(data, r.id).purchases) },
    {
      key: "debt",
      header: "المستحق للمورد",
      cell: (r) => {
        const debt = supplierStats(data, r.id).debt;
        return <span className={debt > 0 ? "font-semibold text-destructive" : ""}>{money(debt)}</span>;
      },
      text: (r) => String(supplierStats(data, r.id).debt),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="الموردون"
        description="بيانات الموردين وأرصدتهم وإجمالى المشتريات منهم"
        actions={
          <Button className="gap-1.5" onClick={() => navigate({ to: "/purchases/suppliers/new" })}>
            <Plus className="size-4" />
            إضافة مورد
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="عدد الموردين" value={String(data.suppliers.length)} />
        <StatCard label="إجمالي المشتريات" value={money(totals.purchases)} />
        <StatCard label="إجمالي المستحق للموردين" value={money(totals.debt)} tone="danger" />
      </div>

      <DataTable
        title="الموردون"
        data={data.suppliers}
        columns={columns}
        rowId={(r) => r.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/purchases/suppliers/$id", params: { id: row.id } }),
              },
              {
                label: "فاتورة شراء جديدة",
                icon: <FileText className="size-4" />,
                onSelect: () => navigate({ to: "/purchases/invoices/new" }),
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const res = deleteSupplier(row.id);
                  res.ok ? toast.success("تم حذف المورد") : toast.error(res.error ?? "خطأ");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}

export function SupplierFormPage({ id }: { id?: string }) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = id ? data.suppliers.find((s) => s.id === id) : undefined;

  const [form, setForm] = useState({
    code: existing?.code ?? nextCode("SU", data.suppliers.map((s) => s.code)),
    name: existing?.name ?? "",
    phone: existing?.phone ?? "",
    branchId: existing?.branchId ?? data.branches[0]?.id ?? "",
  });
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const res = saveSupplier({ ...(existing ? { id: existing.id } : {}), ...form });
    if (!res.ok) {
      toast.error(res.error ?? "تعذر الحفظ");
      return;
    }
    toast.success(existing ? "تم تعديل بيانات المورد" : "تم إضافة المورد");
    navigate({ to: "/purchases/suppliers" });
  };

  return (
    <FormPage
      title={existing ? `تعديل المورد ${existing.name}` : "إضافة مورد جديد"}
      subtitle="بيانات المورد الأساسية"
      onCancel={() => navigate({ to: "/purchases/suppliers" })}
      onSubmit={submit}
    >
      <FormSection title="بيانات المورد">
        <Field label="كود المورد" hint="يتم توليده تلقائياً">
          <Input dir="rtl" value={form.code} readOnly className="bg-muted/50" />
        </Field>
        <Field label="اسم المورد">
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
