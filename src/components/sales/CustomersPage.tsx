import { useNavigate } from "@tanstack/react-router";
import { BellOff, BellRing, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { money } from "@/lib/format";
import { nextCode, useDb, type Party } from "@/lib/mockDb";
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
      key: "notify",
      header: "رسالة الفاتورة",
      align: "center",
      cell: (r) =>
        r.notifyInvoice ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <BellRing className="size-3" /> مُفعّل
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <BellOff className="size-3" /> موقوف
          </span>
        ),
      text: (r) => (r.notifyInvoice ? "مفعل" : "موقوف"),
    },
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
                label: row.notifyInvoice ? "إيقاف رسائل الفاتورة" : "تفعيل رسائل الفاتورة",
                icon: row.notifyInvoice ? <BellOff className="size-4" /> : <BellRing className="size-4" />,
                onSelect: () => {
                  const res = saveCustomer({ ...row, notifyInvoice: !row.notifyInvoice });
                  res.ok
                    ? toast.success(row.notifyInvoice ? "تم إيقاف الرسائل لهذا العميل" : "تم تفعيل الرسائل لهذا العميل")
                    : toast.error(res.error ?? "خطأ");
                },
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
    notifyInvoice: existing?.notifyInvoice ?? true,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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

      <FormSection title="رسائل الفاتورة">
        <div className="sm:col-span-2">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">هل تحب إرسال رسالة للعميل بالفاتورة عند البيع؟</p>
              <p className="text-xs leading-6 text-muted-foreground">
                عند التفعيل يقوم البرنامج بإرسال رسالة واتساب بالفاتورة تلقائياً بعد ترحيل فاتورة المبيعات، بالصيغة
                المحددة مسبقاً فى الإعدادات الرئيسية.
              </p>
            </div>
            <Switch
              checked={form.notifyInvoice}
              onCheckedChange={(checked) => set("notifyInvoice", checked)}
            />
          </div>
        </div>
      </FormSection>
    </FormPage>
  );
}
