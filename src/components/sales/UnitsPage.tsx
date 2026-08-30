import { Pencil, Plus, Power, Ruler, Trash2 } from "lucide-react";
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
import { mutate, uid, useDb, type MeasureUnit } from "@/lib/mockDb";

const emptyUnit = (): MeasureUnit => ({
  id: uid("mu"),
  code: "",
  name: "",
  decimals: 2,
  note: "",
  active: true,
});

/** تكويد وحدات القياس الأساسية للنظام (كيلو / طن / شيكارة / قنطار …) */
export function UnitsPage() {
  const data = useDb();
  const [draft, setDraft] = useState<MeasureUnit | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setDraft(emptyUnit());
    setIsNew(true);
  };

  const save = () => {
    if (!draft) return;
    const code = draft.code.trim();
    const name = draft.name.trim();
    if (!code) return toast.error("أدخل كود الوحدة (بالإنجليزى)");
    if (!name) return toast.error("أدخل اسم الوحدة بالعربى");
    const dup = data.measureUnits.some(
      (u) => u.id !== draft.id && (u.code.toLowerCase() === code.toLowerCase() || u.name === name),
    );
    if (dup) return toast.error("الكود أو الاسم مستخدم بالفعل فى وحدة أخرى");

    mutate((db) => {
      const row: MeasureUnit = { ...draft, code, name, decimals: Number(draft.decimals || 0) };
      const index = db.measureUnits.findIndex((u) => u.id === draft.id);
      if (index >= 0) db.measureUnits[index] = row;
      else db.measureUnits.push(row);
    });
    toast.success(isNew ? "تمت إضافة الوحدة" : "تم تعديل الوحدة");
    setDraft(null);
  };

  const usedBy = (code: string) =>
    data.products.filter((p) => p.unit === code || (p.units ?? []).some((u) => u.code === code)).length;

  const remove = (row: MeasureUnit) => {
    const used = usedBy(row.code);
    if (used > 0) {
      toast.error(`لا يمكن حذف الوحدة — مستخدمة فى ${used} صنف`);
      return;
    }
    mutate((db) => {
      db.measureUnits = db.measureUnits.filter((u) => u.id !== row.id);
    });
    toast.success("تم حذف الوحدة");
  };

  const toggle = (row: MeasureUnit) =>
    mutate((db) => {
      const found = db.measureUnits.find((u) => u.id === row.id);
      if (found) found.active = !found.active;
    });

  const columns: Array<Column<MeasureUnit>> = [
    { key: "code", header: "كود الوحدة", cell: (r) => <span className="font-mono">{r.code}</span>, text: (r) => r.code },
    { key: "name", header: "اسم الوحدة", cell: (r) => r.name, text: (r) => r.name },
    { key: "decimals", header: "خانات الكسور", cell: (r) => String(r.decimals ?? 0), align: "center" },
    { key: "note", header: "ملاحظات", cell: (r) => r.note || "—", text: (r) => r.note },
    {
      key: "used",
      header: "مستخدمة فى",
      align: "center",
      cell: (r) => `${usedBy(r.code)} صنف`,
    },
    {
      key: "active",
      header: "الحالة",
      align: "center",
      cell: (r) => <StatusBadge label={r.active ? "مُفعّلة" : "موقوفة"} tone={r.active ? "green" : "gray"} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="تكويد الوحدات"
        description="الوحدات الأساسية للنظام — تُستخدم كوحدة مخزون للصنف وكوحدات بيع بمعامل تحويل"
        actions={
          <Button className="gap-1.5" onClick={openNew}>
            <Plus className="size-4" />
            وحدة جديدة
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="عدد الوحدات" value={String(data.measureUnits.length)} icon={<Ruler className="size-4" />} />
        <StatCard
          label="وحدات مُفعّلة"
          value={String(data.measureUnits.filter((u) => u.active).length)}
          tone="accent"
        />
        <StatCard
          label="أصناف لها وحدات بيع متعددة"
          value={String(data.products.filter((p) => (p.units ?? []).length > 0).length)}
          tone="muted"
        />
      </div>

      <DataTable
        title="وحدات القياس"
        data={data.measureUnits}
        columns={columns}
        rowId={(r) => r.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => {
                  setDraft({ ...row });
                  setIsNew(false);
                },
              },
              {
                label: row.active ? "إيقاف الوحدة" : "تفعيل الوحدة",
                icon: <Power className="size-4" />,
                onSelect: () => toggle(row),
              },
              { label: "حذف", icon: <Trash2 className="size-4" />, danger: true, onSelect: () => remove(row) },
            ]}
          />
        )}
      />

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{isNew ? "إضافة وحدة قياس" : "تعديل وحدة القياس"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">كود الوحدة (إنجليزى)</Label>
                <Input
                  dir="ltr"
                  placeholder="kg"
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اسم الوحدة بالعربى</Label>
                <Input
                  dir="rtl"
                  placeholder="كيلو"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">عدد خانات الكسور المسموحة</Label>
                <Input
                  type="number"
                  min={0}
                  max={4}
                  value={String(draft.decimals ?? 0)}
                  onChange={(e) => setDraft({ ...draft, decimals: Number(e.target.value || 0) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ملاحظات (اختيارى)</Label>
                <Input
                  dir="rtl"
                  placeholder="1 طن = 1000 كيلو"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={save}>حفظ</Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
