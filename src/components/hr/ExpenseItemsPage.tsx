import { Pencil, Plus, Power, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";
import { deleteExpenseItem, saveExpenseItem } from "@/lib/hrActions";
import { nextCode, useDb, type ExpenseItem } from "@/lib/mockDb";

const GROUP_PRESETS = ["رواتب", "تشغيل", "مرافق", "نثريات", "إدارى", "تسويق", "أخرى"];

/** تكويد بنود الصرف: كل بند بكود واسم ومجموعة */
export function ExpenseItemsPage() {
  const data = useDb();
  const [draft, setDraft] = useState<ExpenseItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setDraft({
      id: "",
      code: nextCode("EX", data.expenseItems.map((i) => i.code)),
      name: "",
      group: "",
      note: "",
      active: true,
    });
    setIsNew(true);
  };

  const openEdit = (row: ExpenseItem) => {
    setDraft({ ...row });
    setIsNew(false);
  };

  const spentOn = (id: string) =>
    data.expenses
      .filter((e) => e.itemId === id && e.status !== "cancelled")
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const usedCount = (id: string) => data.expenses.filter((e) => e.itemId === id).length;

  const submit = () => {
    if (!draft) return;
    const res = saveExpenseItem({ ...draft, id: draft.id || undefined });
    if (!res.ok) return toast.error(res.error ?? "تعذر الحفظ");
    toast.success(isNew ? "تمت إضافة البند" : "تم تعديل البند");
    setDraft(null);
  };

  const toggle = (row: ExpenseItem) => {
    const res = saveExpenseItem({ ...row, active: !row.active });
    if (!res.ok) return toast.error(res.error ?? "تعذر التعديل");
    toast.success(row.active ? "تم إيقاف البند" : "تم تنشيط البند");
  };

  const remove = (row: ExpenseItem) => {
    const res = deleteExpenseItem(row.id);
    if (!res.ok) return toast.error(res.error ?? "تعذر الحذف");
    toast.success("تم حذف البند");
  };

  const columns: Array<Column<ExpenseItem>> = [
    { key: "code", header: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "بند الصرف", cell: (r) => r.name, text: (r) => r.name },
    { key: "group", header: "المجموعة", cell: (r) => r.group || "—", text: (r) => r.group },
    { key: "count", header: "عدد الحركات", align: "center", cell: (r) => usedCount(r.id) },
    { key: "spent", header: "إجمالى المنصرف", cell: (r) => money(spentOn(r.id)) },
    { key: "note", header: "ملاحظات", cell: (r) => r.note || "—", text: (r) => r.note },
    {
      key: "active",
      header: "الحالة",
      align: "center",
      cell: (r) => <StatusBadge label={r.active ? "نشط" : "موقوف"} tone={r.active ? "green" : "gray"} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="تكويد بنود الصرف"
        description="كل بنود المصروفات العامة والنثريات — تُستخدم فى تسجيل أى مصروف"
        actions={
          <Button className="gap-1.5" onClick={openNew}>
            <Plus className="size-4" />
            بند صرف جديد
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="عدد البنود" value={String(data.expenseItems.length)} icon={<Tags className="size-4" />} />
        <StatCard label="بنود نشطة" value={String(data.expenseItems.filter((i) => i.active).length)} />
        <StatCard
          label="إجمالى المنصرف على البنود"
          value={money(data.expenses.filter((e) => e.status !== "cancelled").reduce((a, e) => a + e.amount, 0))}
          tone="accent"
        />
      </div>

      <DataTable
        title="بنود الصرف"
        data={data.expenseItems}
        columns={columns}
        rowId={(r) => r.id}
        actions={(row) => (
          <RowActions
            actions={[
              { label: "تعديل", icon: <Pencil className="size-4" />, onSelect: () => openEdit(row) },
              {
                label: row.active ? "إيقاف البند" : "تنشيط البند",
                icon: <Power className="size-4" />,
                onSelect: () => toggle(row),
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                disabled: usedCount(row.id) > 0,
                onSelect: () => remove(row),
              },
            ]}
          />
        )}
      />

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "بند صرف جديد" : "تعديل بند الصرف"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">الكود</Label>
                <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اسم البند</Label>
                <Input
                  dir="rtl"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="مثال: نقل وشحن"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">المجموعة</Label>
                <Input
                  dir="rtl"
                  value={draft.group}
                  onChange={(e) => setDraft({ ...draft, group: e.target.value })}
                  placeholder="رواتب / تشغيل / نثريات"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {GROUP_PRESETS.map((g) => (
                    <Button
                      key={g}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setDraft({ ...draft, group: g })}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">ملاحظات</Label>
                <Input dir="rtl" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              إلغاء
            </Button>
            <Button type="button" onClick={submit}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
