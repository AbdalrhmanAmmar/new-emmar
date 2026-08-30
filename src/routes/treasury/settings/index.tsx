import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { EntityEditor, type FieldDef } from "@/components/treasury/EntityEditor";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money } from "@/lib/format";
import {
  type AppUser,
  type Branch,
  type Category,
  type SalesRep,
  type Warehouse,
  mutate,
  resetDb,
  uid,
  useDb,
} from "@/lib/mockDb";

export const Route = createFileRoute("/treasury/settings/")({
  head: () => ({
    meta: [
      { title: "الإعدادات المتقدمة — الخزينة" },
      { name: "description", content: "إضافة وتعديل بيانات النظام: الفروع والمستخدمين والبنود والمخازن والمندوبين." },
      { property: "og:title", content: "إعدادات وبيانات النظام" },
      { property: "og:description", content: "إدارة كاملة لبيانات النظام الأساسية مع إمكانية الإضافة والتعديل والحذف." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const data = useDb();
  const branchOptions = data.branches.map((b) => ({ value: b.id, label: b.name }));

  const branchFields: FieldDef<Branch>[] = [{ key: "name", label: "اسم الفرع", required: true }];

  const userFields: FieldDef<AppUser>[] = [
    { key: "name", label: "اسم المستخدم", required: true },
    { key: "role", label: "الوظيفة", required: true },
  ];

  const categoryFields: FieldDef<Category>[] = [
    { key: "name", label: "اسم البند", required: true },
    {
      key: "kind",
      label: "النوع",
      type: "select",
      required: true,
      options: [
        { value: "revenue", label: "إيراد" },
        { value: "expense", label: "مصروف" },
      ],
    },
  ];

  const warehouseFields: FieldDef<Warehouse>[] = [
    { key: "code", label: "الكود", required: true },
    { key: "name", label: "اسم المخزن", required: true },
    { key: "branchId", label: "الفرع", type: "select", required: true, options: branchOptions },
  ];

  const repFields: FieldDef<SalesRep>[] = [
    { key: "name", label: "اسم المندوب", required: true },
    { key: "phone", label: "الهاتف" },
    { key: "branchId", label: "الفرع", type: "select", required: true, options: branchOptions },
    { key: "commissionPct", label: "نسبة العمولة %", type: "number" },
  ];

  function saveInto<T extends { id: string }>(list: keyof typeof data, row: T, isNew: boolean) {
    mutate((db) => {
      const target = db[list] as unknown as T[];
      if (isNew) target.push(row);
      else {
        const index = target.findIndex((item) => item.id === row.id);
        if (index >= 0) target[index] = row;
      }
    });
  }

  function removeFrom<T extends { id: string }>(list: keyof typeof data, row: T) {
    mutate((db) => {
      const target = db[list] as unknown as T[];
      const index = target.findIndex((item) => item.id === row.id);
      if (index >= 0) target.splice(index, 1);
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader title="الإعدادات المتقدمة" description="إضافة وتعديل بيانات النظام الأساسية" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="الفروع" value={String(data.branches.length)} />
        <StatCard label="المستخدمون" value={String(data.users.length)} tone="accent" />
        <StatCard label="الخزن والحسابات" value={String(data.safes.length)} tone="muted" />
        <StatCard label="بنود الإيراد/المصروف" value={String(data.categories.length)} />
      </div>

      <Tabs defaultValue="branches" dir="rtl">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branches">الفروع</TabsTrigger>
          <TabsTrigger value="users">المستخدمون</TabsTrigger>
          <TabsTrigger value="categories">البنود</TabsTrigger>
          <TabsTrigger value="warehouses">المخازن</TabsTrigger>
          <TabsTrigger value="reps">المندوبون</TabsTrigger>
        </TabsList>

        <TabsContent value="branches" className="mt-3">
          <EntityEditor<Branch>
            title="الفروع"
            description="الفروع المرتبطة بالخزن والعملاء"
            rows={data.branches}
            fields={branchFields}
            primary={(row) => row.name}
            secondary={(row) =>
              `الخزن: ${data.safes.filter((s) => s.branchId === row.id).length} — الأرصدة الافتتاحية: ${money(
                data.safes.filter((s) => s.branchId === row.id).reduce((acc, s) => acc + s.openingBalance, 0),
              )}`
            }
            emptyRow={() => ({ id: uid("br"), name: "" })}
            onSave={(row, isNew) => saveInto("branches", row, isNew)}
            onDelete={(row) => {
              if (data.safes.some((s) => s.branchId === row.id)) return "لا يمكن حذف فرع مرتبط بخزن";
              if (data.vouchers.some((v) => v.branchId === row.id)) return "لا يمكن حذف فرع له سندات";
              removeFrom("branches", row);
            }}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-3">
          <EntityEditor<AppUser>
            title="المستخدمون"
            description="أمناء الخزن والمحاسبون"
            rows={data.users}
            fields={userFields}
            primary={(row) => row.name}
            secondary={(row) => row.role}
            emptyRow={() => ({ id: uid("u"), name: "", role: "محاسب" })}
            onSave={(row, isNew) => saveInto("users", row, isNew)}
            onDelete={(row) => {
              if (data.vouchers.some((v) => v.userId === row.id)) return "لا يمكن حذف مستخدم له سندات";
              removeFrom("users", row);
            }}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-3">
          <div className="grid gap-4 lg:grid-cols-2">
            <EntityEditor<Category>
              title="بنود الإيرادات"
              rows={data.categories.filter((c) => c.kind === "revenue")}
              fields={categoryFields}
              primary={(row) => row.name}
              emptyRow={() => ({ id: uid("rv"), name: "", kind: "revenue" })}
              onSave={(row, isNew) => saveInto("categories", row, isNew)}
              onDelete={(row) => {
                if (data.vouchers.some((v) => v.categoryId === row.id)) return "البند مستخدم في سندات";
                removeFrom("categories", row);
              }}
            />
            <EntityEditor<Category>
              title="بنود المصروفات"
              rows={data.categories.filter((c) => c.kind === "expense")}
              fields={categoryFields}
              primary={(row) => row.name}
              emptyRow={() => ({ id: uid("ex"), name: "", kind: "expense" })}
              onSave={(row, isNew) => saveInto("categories", row, isNew)}
              onDelete={(row) => {
                if (data.vouchers.some((v) => v.categoryId === row.id)) return "البند مستخدم في سندات";
                removeFrom("categories", row);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="warehouses" className="mt-3">
          <EntityEditor<Warehouse>
            title="المخازن"
            rows={data.warehouses}
            fields={warehouseFields}
            primary={(row) => `${row.code} — ${row.name}`}
            secondary={(row) => data.branches.find((b) => b.id === row.branchId)?.name ?? "-"}
            emptyRow={() => ({
              id: uid("wh"),
              code: "",
              name: "",
              branchId: data.branches[0]?.id ?? "",
            })}
            onSave={(row, isNew) => saveInto("warehouses", row, isNew)}
            onDelete={(row) => {
              if (data.salesInvoices.some((i) => i.warehouseId === row.id)) return "المخزن مستخدم في فواتير";
              removeFrom("warehouses", row);
            }}
          />
        </TabsContent>

        <TabsContent value="reps" className="mt-3">
          <EntityEditor<SalesRep>
            title="المندوبون"
            rows={data.reps}
            fields={repFields}
            primary={(row) => row.name}
            secondary={(row) =>
              `${data.branches.find((b) => b.id === row.branchId)?.name ?? "-"} — عمولة ${row.commissionPct}%`
            }
            emptyRow={() => ({
              id: uid("rep"),
              name: "",
              phone: "",
              branchId: data.branches[0]?.id ?? "",
              commissionPct: 0,
            })}
            onSave={(row, isNew) => saveInto("reps", row, isNew)}
            onDelete={(row) => {
              if (data.salesInvoices.some((i) => i.repId === row.id)) return "المندوب مرتبط بفواتير";
              removeFrom("reps", row);
            }}
          />
        </TabsContent>
      </Tabs>

      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-destructive">إعادة تعيين البيانات</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            حذف كل السندات والتحويلات والورديات المسجلة والعودة لبيانات الوضع الافتراضي. لا يمكن التراجع.
          </p>
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              resetDb();
              toast.success("تم إعادة تعيين بيانات النظام");
            }}
          >
            <RotateCcw className="size-4" />
            إعادة تعيين البيانات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
