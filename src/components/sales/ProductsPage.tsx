import { useNavigate } from "@tanstack/react-router";
import { Barcode, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProductUnitsEditor } from "@/components/sales/ProductUnitsEditor";
import { DataTable, type Column } from "@/components/treasury/DataTable";
import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, num } from "@/lib/format";
import { UNIT_LABEL, nextCode, useDb, type Product, type ProductUnit } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";
import { deleteProduct, saveProduct, toggleProductActive } from "@/lib/salesActions";

export function ProductsPage() {
  const data = useDb();
  const navigate = useNavigate();

  const stockValue = data.products.reduce((sum, p) => sum + p.stock * p.cost, 0);
  const low = data.products.filter((p) => p.stock <= p.minStock);

  const printLabels = (p: Product) =>
    printHtml(
      `باركود ${p.name}`,
      `<h1>ملصقات باركود — ${p.name}</h1>${Array.from({ length: 6 })
        .map(
          () => `<div style="border:1px dashed #98a89d;padding:10px;text-align:center;width:31%;display:inline-block;margin:4px">
      <div style="font-size:12px;font-weight:600">${p.name}</div>
      <div style="font-family:monospace;font-size:22px;letter-spacing:2px">||| ||| || |||| |</div>
      <div style="font-size:12px">${p.barcode || p.code}</div>
      <div style="font-size:12px">${money(p.unitPrice)} / ${UNIT_LABEL[p.unit]}</div></div>`,
        )
        .join("")}`,
    );

  const columns: Array<Column<Product>> = [
    { key: "code", header: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "اسم الصنف", cell: (r) => r.name, text: (r) => r.name },
    { key: "barcode", header: "الباركود", cell: (r) => r.barcode || "-", text: (r) => r.barcode },
    { key: "category", header: "التصنيف", cell: (r) => r.category || "-", text: (r) => r.category },
    { key: "unit", header: "الوحدة", cell: (r) => UNIT_LABEL[r.unit], align: "center" },
    {
      key: "units",
      header: "وحدات البيع",
      align: "center",
      cell: (r) =>
        r.units?.length
          ? r.units.map((u) => u.name || u.code).join(" / ")
          : "—",
      text: (r) => (r.units ?? []).map((u) => `${u.code} ${u.name}`).join(" "),
    },
    { key: "price", header: "سعر البيع", cell: (r) => money(r.unitPrice), text: (r) => String(r.unitPrice) },
    { key: "wholesale", header: "سعر الجملة", cell: (r) => money(r.wholesalePrice) },
    { key: "cost", header: "التكلفة", cell: (r) => money(r.cost) },
    {
      key: "stock",
      header: "المتاح",
      align: "center",
      cell: (r) => (
        <span className={r.stock <= r.minStock ? "font-semibold text-destructive" : ""}>{num(r.stock)}</span>
      ),
      text: (r) => String(r.stock),
    },
    {
      key: "active",
      header: "الحالة",
      align: "center",
      cell: (r) => <StatusBadge label={r.active ? "مُفعّل" : "موقوف"} tone={r.active ? "green" : "gray"} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="الأصناف والأسعار"
        description="بيانات أصناف الأعلاف، أكواد الباركود، الأسعار، والأرصدة المتاحة"
        actions={
          <Button className="gap-1.5" onClick={() => navigate({ to: "/sales/products/new" })}>
            <Plus className="size-4" />
            صنف جديد
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد الأصناف" value={String(data.products.length)} />
        <StatCard label="قيمة المخزون بالتكلفة" value={money(stockValue)} tone="accent" />
        <StatCard label="أصناف تحت حد الطلب" value={String(low.length)} tone="danger" />
        <StatCard label="التصنيفات" value={String(new Set(data.products.map((p) => p.category)).size)} tone="muted" />
      </div>

      <DataTable
        title="الأصناف"
        data={data.products}
        columns={columns}
        rowId={(r) => r.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/sales/products/$id", params: { id: row.id } }),
              },
              { label: "طباعة باركود", icon: <Barcode className="size-4" />, onSelect: () => printLabels(row) },
              {
                label: row.active ? "إيقاف الصنف" : "تفعيل الصنف",
                icon: <Power className="size-4" />,
                onSelect: () => toggleProductActive(row.id),
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const res = deleteProduct(row.id);
                  res.ok ? toast.success("تم حذف الصنف") : toast.error(res.error ?? "خطأ");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}

/** توليد باركود EAN-13 تسلسلى تلقائى */
function autoBarcode(existing: string[]): string {
  let max = 6221000000000;
  for (const value of existing) {
    const n = Number(String(value ?? "").trim());
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

export function ProductFormPage({ id }: { id?: string }) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = id ? data.products.find((p) => p.id === id) : undefined;

  const [form, setForm] = useState({
    code: existing?.code ?? nextCode("IT", data.products.map((p) => p.code)),
    name: existing?.name ?? "",
    barcode: existing?.barcode ?? autoBarcode(data.products.map((p) => p.barcode)),
    serial: existing?.serial ?? nextCode("SR", data.products.map((p) => p.serial)),
    unit: existing?.unit ?? "ton",
    unitPrice: String(existing?.unitPrice ?? ""),
    wholesalePrice: String(existing?.wholesalePrice ?? ""),
    cost: String(existing?.cost ?? ""),
    taxRate: String(existing?.taxRate ?? 14),
    category: existing?.category ?? "",
    stock: String(existing?.stock ?? 0),
    minStock: String(existing?.minStock ?? 0),
  });
  const [units, setUnits] = useState<ProductUnit[]>(existing?.units ?? []);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const res = saveProduct({
      ...(existing ? { id: existing.id } : {}),
      code: form.code,
      name: form.name,
      barcode: form.barcode,
      serial: form.serial,
      unit: form.unit as Product["unit"],
      unitPrice: Number(form.unitPrice || 0),
      wholesalePrice: Number(form.wholesalePrice || 0),
      cost: Number(form.cost || 0),
      taxRate: Number(form.taxRate || 0),
      category: form.category,
      stock: Number(form.stock || 0),
      minStock: Number(form.minStock || 0),
      active: existing?.active ?? true,
      units,
    });
    if (!res.ok) {
      toast.error(res.error ?? "تعذر الحفظ");
      return;
    }
    toast.success(existing ? "تم تعديل الصنف" : "تم إضافة الصنف");
    navigate({ to: "/sales/products" });
  };

  return (
    <FormPage
      title={existing ? `تعديل الصنف ${existing.name}` : "إضافة صنف جديد"}
      subtitle="بيانات الصنف وأسعاره وحدود المخزون"
      onCancel={() => navigate({ to: "/sales/products" })}
      onSubmit={submit}
    >
      <FormSection title="البيانات الأساسية">
        <Field label="كود الصنف" hint="يتم توليده تلقائياً">
          <Input dir="rtl" value={form.code} readOnly className="bg-muted/50" />
        </Field>
        <Field label="اسم الصنف">
          <Input dir="rtl" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="التصنيف" hint="التصنيفات من الإعدادات الرئيسية">
          <SearchSelect
            value={form.category}
            onChange={(v) => set("category", v)}
            options={data.productCategories
              .filter((c) => c.active)
              .map((c) => ({ value: c.name, label: c.name, hint: c.code }))}
            placeholder="اختر التصنيف"
          />
        </Field>

        <Field label="الباركود">
          <Input dir="rtl" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
        </Field>
        <Field label="السريال">
          <Input dir="rtl" value={form.serial} onChange={(e) => set("serial", e.target.value)} />
        </Field>
        <Field label="وحدة القياس">
          <SearchSelect
            options={data.measureUnits
              .filter((u) => u.active)
              .map((u) => ({ value: u.code, label: u.name, hint: u.code }))}
            value={form.unit}
            onChange={(v) => set("unit", v)}
          />
        </Field>
      </FormSection>

      <FormSection title="الأسعار والضريبة">
        <Field label="سعر البيع">
          <Input type="number" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} />
        </Field>
        <Field label="سعر الجملة">
          <Input type="number" value={form.wholesalePrice} onChange={(e) => set("wholesalePrice", e.target.value)} />
        </Field>
        <Field label="التكلفة">
          <Input type="number" value={form.cost} onChange={(e) => set("cost", e.target.value)} />
        </Field>
        <Field label="نسبة الضريبة %" hint="القيمة المضافة في مصر 14%">
          <Input type="number" value={form.taxRate} onChange={(e) => set("taxRate", e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title="المخزون">
        <Field label="الرصيد المتاح">
          <Input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
        </Field>
        <Field label="حد الطلب">
          <Input type="number" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title="وحدات البيع ومعاملات التحويل" className="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1">
        <ProductUnitsEditor
          baseUnit={form.unit as Product["unit"]}
          units={units}
          onChange={setUnits}
          basePrice={Number(form.unitPrice || 0)}
          baseWholesale={Number(form.wholesalePrice || 0)}
        />
      </FormSection>
    </FormPage>
  );
}
