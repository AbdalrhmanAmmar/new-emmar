import { Link, useNavigate } from "@tanstack/react-router";
import { Package, Pencil, Plus, Power, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { money, num } from "@/lib/format";
import { warehouseBalance } from "@/lib/inventory";
import { deleteWarehouse, saveWarehouse, toggleWarehouseActive } from "@/lib/inventoryActions";
import {
  WAREHOUSE_TYPE_LABEL,
  nextCode,
  useDb,
  type Warehouse,
  type WarehouseType,
} from "@/lib/mockDb";

export function WarehousesPage() {
  const data = useDb();
  const navigate = useNavigate();

  const stats = (id: string) => {
    const rows = warehouseBalance(data, id);
    return {
      items: rows.length,
      qty: rows.reduce((s, r) => s + r.qty, 0),
      value: rows.reduce((s, r) => s + r.value, 0),
    };
  };

  const columns: Array<Column<Warehouse>> = [
    { key: "code", header: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "اسم المخزن", cell: (r) => r.name, text: (r) => r.name },
    {
      key: "type",
      header: "النوع",
      align: "center",
      cell: (r) => (
        <StatusBadge
          label={WAREHOUSE_TYPE_LABEL[r.type ?? "main"]}
          tone={(r.type ?? "main") === "main" ? "green" : "gold"}
        />
      ),
      text: (r) => WAREHOUSE_TYPE_LABEL[r.type ?? "main"],
    },
    {
      key: "parent",
      header: "تابع لـ",
      cell: (r) => (r.parentId ? data.warehouses.find((w) => w.id === r.parentId)?.name ?? "-" : "-"),
      text: (r) => (r.parentId ? data.warehouses.find((w) => w.id === r.parentId)?.name ?? "" : ""),
    },
    {
      key: "branch",
      header: "الفرع",
      cell: (r) => data.branches.find((b) => b.id === r.branchId)?.name ?? "-",
      text: (r) => data.branches.find((b) => b.id === r.branchId)?.name ?? "",
    },
    {
      key: "keeper",
      header: "أمين المخزن",
      cell: (r) => data.users.find((u) => u.id === r.keeperId)?.name ?? "-",
      text: (r) => data.users.find((u) => u.id === r.keeperId)?.name ?? "",
    },
    { key: "items", header: "عدد الأصناف", align: "center", cell: (r) => stats(r.id).items },
    { key: "qty", header: "إجمالي الرصيد", cell: (r) => num(stats(r.id).qty) },
    { key: "value", header: "قيمة المخزون", cell: (r) => money(stats(r.id).value) },
    {
      key: "active",
      header: "الحالة",
      align: "center",
      cell: (r) => (
        <StatusBadge label={r.active === false ? "معطّل" : "نشط"} tone={r.active === false ? "gray" : "green"} />
      ),
      text: (r) => (r.active === false ? "معطل" : "نشط"),
    },
  ];

  const totals = warehouseBalance(data, null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="تكويد المخازن الرئيسية والفرعية"
        description="مخازن رئيسية ومخازن فرعية تابعة لها مع أمين مخزن وفرع لكل مخزن"
        actions={
          <Button asChild className="gap-1.5">
            <Link to="/inventory/warehouses/new">
              <Plus className="size-4" />
              مخزن جديد
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد المخازن" value={num(data.warehouses.length)} icon={<WarehouseIcon className="size-4" />} />
        <StatCard
          label="مخازن رئيسية"
          value={num(data.warehouses.filter((w) => (w.type ?? "main") === "main").length)}
          tone="accent"
        />
        <StatCard label="مخازن فرعية" value={num(data.warehouses.filter((w) => w.type === "sub").length)} tone="muted" />
        <StatCard
          label="إجمالي قيمة المخزون"
          value={money(totals.reduce((s, r) => s + r.value, 0))}
          icon={<Package className="size-4" />}
        />
      </div>

      <DataTable
        data={data.warehouses}
        columns={columns}
        rowId={(r) => r.id}
        title="المخازن"
        searchPlaceholder="ابحث بكود أو اسم المخزن أو الفرع..."
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/inventory/warehouses/$id", params: { id: row.id } }),
              },
              {
                label: row.active === false ? "تنشيط" : "إيقاف",
                icon: <Power className="size-4" />,
                onSelect: () => {
                  toggleWarehouseActive(row.id);
                  toast.success("تم تحديث حالة المخزن");
                },
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const res = deleteWarehouse(row.id);
                  if (!res.ok) toast.error(res.error);
                  else toast.success("تم حذف المخزن");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}

export function WarehouseFormPage({ warehouseId }: { warehouseId?: string }) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = warehouseId ? data.warehouses.find((w) => w.id === warehouseId) : undefined;

  const [code, setCode] = useState(existing?.code ?? nextCode("WH", data.warehouses.map((w) => w.code)));
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<WarehouseType>(existing?.type ?? "main");
  const [parentId, setParentId] = useState(existing?.parentId ?? "");
  const [branchId, setBranchId] = useState(existing?.branchId ?? data.branches[0]?.id ?? "");
  const [keeperId, setKeeperId] = useState(existing?.keeperId ?? data.users[0]?.id ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [active, setActive] = useState(existing?.active !== false);

  const submit = () => {
    const res = saveWarehouse({
      id: existing?.id,
      code,
      name,
      type,
      parentId: parentId || null,
      branchId,
      keeperId: keeperId || null,
      address,
      note,
      active,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("تم حفظ بيانات المخزن");
    navigate({ to: "/inventory/warehouses" });
  };

  const parents = data.warehouses
    .filter((w) => (w.type ?? "main") === "main" && w.id !== existing?.id)
    .map((w) => ({ value: w.id, label: w.name, hint: w.code }));

  return (
    <FormPage
      title={existing ? `تعديل مخزن — ${existing.name}` : "إضافة مخزن جديد"}
      subtitle="مخزن رئيسي أو مخزن فرعي تابع لمخزن رئيسي"
      onCancel={() => navigate({ to: "/inventory/warehouses" })}
      onSubmit={submit}
    >
      <FormSection title="البيانات الأساسية">
        <Field label="الكود" hint="يتم توليده تلقائياً ويمكن تعديله">
          <Input dir="rtl" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label="اسم المخزن">
          <Input dir="rtl" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="النوع">
          <SearchSelect
            options={Object.entries(WAREHOUSE_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
            value={type}
            onChange={(value) => setType((value as WarehouseType) || "main")}
          />
        </Field>
        {type === "sub" ? (
          <Field label="المخزن الرئيسي التابع له">
            <SearchSelect options={parents} value={parentId} onChange={(v) => setParentId(v ?? "")} />
          </Field>
        ) : null}
        <Field label="الفرع">
          <SearchSelect
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchId}
            onChange={(v) => setBranchId(v ?? "")}
          />
        </Field>
        <Field label="أمين المخزن">
          <SearchSelect
            options={data.users.map((u) => ({ value: u.id, label: u.name, hint: u.role }))}
            value={keeperId}
            onChange={(v) => setKeeperId(v ?? "")}
          />
        </Field>
      </FormSection>

      <FormSection title="بيانات إضافية">
        <Field label="العنوان" className="sm:col-span-2">
          <Input dir="rtl" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="الحالة">
          <div className="flex items-center gap-2 pt-1.5">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label className="text-sm">{active ? "نشط" : "معطّل"}</Label>
          </div>
        </Field>
        <Field label="ملاحظات" className="sm:col-span-2 lg:col-span-3">
          <Textarea dir="rtl" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </FormSection>
    </FormPage>
  );
}
