import { Minus, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
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
import { activeEmployees, currentMonth, employeeName } from "@/lib/hr";
import { deletePayrollAdjustment, savePayrollAdjustment } from "@/lib/hrActions";
import {
  ADJUSTMENT_KIND_LABEL,
  ALLOWANCE_PRESETS,
  DEDUCTION_PRESETS,
  useDb,
  type AdjustmentKind,
  type PayrollAdjustment,
} from "@/lib/mockDb";

type Draft = Omit<PayrollAdjustment, "id"> & { id?: string };

/** البدلات والخصومات: إضافة بند لأى موظف مرتبط بشهر محدد */
export function AdjustmentsPage() {
  const data = useDb();
  const [month, setMonth] = useState(currentMonth());
  const [draft, setDraft] = useState<Draft | null>(null);

  const rows = useMemo(
    () => (data.adjustments ?? []).filter((a) => a.month === month),
    [data.adjustments, month],
  );

  const totals = rows.reduce(
    (acc, a) => {
      if (a.kind === "allowance") acc.allow += Number(a.amount || 0);
      else acc.deduct += Number(a.amount || 0);
      return acc;
    },
    { allow: 0, deduct: 0 },
  );

  const employeeOptions = activeEmployees(data).map((e) => ({
    value: e.id,
    label: e.name,
    hint: `${e.code} • ${e.jobTitle}`,
  }));

  const openNew = (kind: AdjustmentKind) =>
    setDraft({ employeeId: "", month, kind, label: "", amount: 0, note: "" });

  const submit = () => {
    if (!draft) return;
    const res = savePayrollAdjustment(draft);
    if (!res.ok) return toast.error(res.error ?? "تعذر الحفظ");
    toast.success(draft.id ? "تم تعديل البند" : "تمت إضافة البند");
    setDraft(null);
  };

  const remove = (row: PayrollAdjustment) => {
    deletePayrollAdjustment(row.id);
    toast.success("تم حذف البند");
  };

  const presets = draft?.kind === "deduction" ? DEDUCTION_PRESETS : ALLOWANCE_PRESETS;

  const columns: Array<Column<PayrollAdjustment>> = [
    { key: "month", header: "الشهر", align: "center", cell: (r) => r.month, text: (r) => r.month },
    {
      key: "employee",
      header: "الموظف",
      cell: (r) => employeeName(data, r.employeeId),
      text: (r) => employeeName(data, r.employeeId),
    },
    {
      key: "kind",
      header: "النوع",
      align: "center",
      cell: (r) => (
        <StatusBadge
          label={ADJUSTMENT_KIND_LABEL[r.kind]}
          tone={r.kind === "allowance" ? "green" : "red"}
        />
      ),
      text: (r) => ADJUSTMENT_KIND_LABEL[r.kind],
    },
    { key: "label", header: "البند", cell: (r) => r.label, text: (r) => r.label },
    {
      key: "amount",
      header: "المبلغ",
      cell: (r) => (
        <span className={r.kind === "allowance" ? "font-semibold text-primary" : "font-semibold text-destructive"}>
          {r.kind === "allowance" ? "" : "- "}
          {money(r.amount)}
        </span>
      ),
    },
    { key: "note", header: "ملاحظات", cell: (r) => r.note || "—", text: (r) => r.note },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="البدلات والخصومات"
        description="أضف بدلًا أو خصمًا لأى موظف واربطه بشهر محدد — يُحسب تلقائيًا فى مسير الرواتب وكشف الموظف"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 w-40"
            />
            <Button className="gap-1.5" onClick={() => openNew("allowance")}>
              <Plus className="size-4" />
              بدل جديد
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => openNew("deduction")}>
              <Minus className="size-4" />
              خصم جديد
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={`إجمالى البدلات ${month}`}
          value={money(totals.allow)}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label={`إجمالى الخصومات ${month}`}
          value={money(totals.deduct)}
          tone="danger"
          icon={<TrendingDown className="size-4" />}
        />
        <StatCard label="صافى الأثر على الرواتب" value={money(totals.allow - totals.deduct)} tone="accent" />
      </div>

      <DataTable
        title={`بدلات وخصومات ${month}`}
        data={rows}
        columns={columns}
        rowId={(r) => r.id}
        footerNote={`بدلات: ${money(totals.allow)} — خصومات: ${money(totals.deduct)}`}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () => setDraft({ ...row }),
              },
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

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? "تعديل البند" : draft?.kind === "deduction" ? "إضافة خصم" : "إضافة بدل"}
            </DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">الموظف</Label>
                <SearchSelect
                  value={draft.employeeId || null}
                  onChange={(v) => setDraft({ ...draft, employeeId: v ?? "" })}
                  options={employeeOptions}
                  placeholder="اختر الموظف"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الشهر</Label>
                <Input
                  type="month"
                  value={draft.month}
                  onChange={(e) => setDraft({ ...draft, month: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">النوع</Label>
                <div className="flex gap-2">
                  {(["allowance", "deduction"] as AdjustmentKind[]).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      variant={draft.kind === k ? "default" : "outline"}
                      className="h-9 flex-1"
                      onClick={() => setDraft({ ...draft, kind: k })}
                    >
                      {ADJUSTMENT_KIND_LABEL[k]}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">البند</Label>
                <Input
                  dir="rtl"
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder={draft.kind === "deduction" ? "مثال: جزاء" : "مثال: بدل انتقالات"}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">المبلغ</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={draft.amount || ""}
                  onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value || 0) })}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 sm:col-span-2">
                {presets.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setDraft({ ...draft, label: p })}
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">ملاحظات</Label>
                <Input
                  dir="rtl"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                />
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
