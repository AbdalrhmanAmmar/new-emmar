import { createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, Play, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { dateTimeFmt, money } from "@/lib/format";
import { useDb, type Shift } from "@/lib/mockDb";
import { printRecord } from "@/lib/printDoc";
import { safeBalance } from "@/lib/treasury";
import { closeShift, openShift } from "@/lib/treasuryActions";

export const Route = createFileRoute("/treasury/shifts/")({
  head: () => ({
    meta: [
      { title: "تقفيل الخزينة والورديات — الخزينة" },
      { name: "description", content: "فتح وتقفيل ورديات الخزينة ومطابقة الرصيد الدفتري بالنقدية الفعلية." },
      { property: "og:title", content: "التقفيل اليومي والورديات" },
      { property: "og:description", content: "حصر النقدية الفعلية وتسجيل الفروقات وتسويتها آلياً." },
    ],
  }),
  component: ShiftsPage,
});

function ShiftsPage() {
  const data = useDb();
  const [openSafeId, setOpenSafeId] = useState(data.safes[0]?.id ?? "");
  const [openUserId, setOpenUserId] = useState(data.users[0]?.id ?? "");
  const [target, setTarget] = useState<Shift | null>(null);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [settle, setSettle] = useState(true);

  const safeName = (id: string) => data.safes.find((s) => s.id === id)?.name ?? "-";
  const userName = (id: string) => data.users.find((u) => u.id === id)?.name ?? "-";
  const rows = data.shifts.slice().sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));

  const columns: Array<Column<Shift>> = [
    { key: "no", header: "رقم الوردية", cell: (row) => <strong>{row.no}</strong>, text: (row) => row.no },
    { key: "safe", header: "الخزينة", cell: (row) => safeName(row.safeId), text: (row) => safeName(row.safeId) },
    { key: "user", header: "أمين الخزينة", cell: (row) => userName(row.userId), text: (row) => userName(row.userId) },
    { key: "opened", header: "وقت الفتح", cell: (row) => dateTimeFmt(row.openedAt), text: (row) => dateTimeFmt(row.openedAt) },
    { key: "closed", header: "وقت التقفيل", cell: (row) => (row.closedAt ? dateTimeFmt(row.closedAt) : "-"), text: (row) => row.closedAt ?? "" },
    { key: "opening", header: "رصيد الفتح", cell: (row) => money(row.openingBalance), text: (row) => String(row.openingBalance) },
    {
      key: "system",
      header: "الرصيد الدفتري",
      cell: (row) => money(row.status === "open" ? safeBalance(data, row.safeId) : (row.systemBalance ?? 0)),
      text: (row) => String(row.systemBalance ?? ""),
    },
    { key: "counted", header: "النقدية الفعلية", cell: (row) => (row.countedBalance === null ? "-" : money(row.countedBalance)), text: (row) => String(row.countedBalance ?? "") },
    {
      key: "diff",
      header: "الفرق",
      cell: (row) =>
        row.difference === null ? (
          "-"
        ) : (
          <strong className={row.difference === 0 ? "text-primary" : "text-destructive"}>{money(row.difference)}</strong>
        ),
      text: (row) => String(row.difference ?? ""),
    },
    {
      key: "status",
      header: "الحالة",
      align: "center",
      cell: (row) => (
        <StatusBadge label={row.status === "open" ? "مفتوحة" : "مقفلة"} tone={row.status === "open" ? "gold" : "green"} />
      ),
      text: (row) => (row.status === "open" ? "مفتوحة" : "مقفلة"),
    },
  ];

  const submitClose = () => {
    if (!target) return;
    if (counted === "") {
      toast.error("أدخل النقدية الفعلية المحصورة");
      return;
    }
    const result = closeShift(target.id, Number(counted), reason, settle);
    if (!result.ok) {
      toast.error(result.error ?? "تعذّر التقفيل");
      return;
    }
    toast.success("تم تقفيل الوردية");
    setTarget(null);
    setCounted("");
    setReason("");
  };

  const openShifts = rows.filter((row) => row.status === "open");
  const diffTotal = rows.reduce((acc, row) => acc + Math.abs(row.difference ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="التقفيل اليومي والورديات"
        description="فتح وتقفيل ورديات الخزينة مع المطابقة النقدية الفعلية"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="ورديات مفتوحة" value={String(openShifts.length)} tone="accent" />
        <StatCard label="إجمالي الفروقات المسجلة" value={money(diffTotal)} tone="danger" />
        <StatCard label="عدد الورديات" value={String(rows.length)} tone="muted" />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="w-56 space-y-1.5">
          <Label className="text-xs text-muted-foreground">الخزينة</Label>
          <SearchSelect
            options={data.safes.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))}
            value={openSafeId}
            onChange={setOpenSafeId}
          />
        </div>
        <div className="w-56 space-y-1.5">
          <Label className="text-xs text-muted-foreground">أمين الخزينة</Label>
          <SearchSelect
            options={data.users.map((u) => ({ value: u.id, label: u.name, hint: u.role }))}
            value={openUserId}
            onChange={setOpenUserId}
          />
        </div>
        <Button
          className="gap-1.5"
          onClick={() => {
            const result = openShift(openSafeId, openUserId);
            if (result.ok) toast.success("تم فتح وردية جديدة");
            else toast.error(result.error ?? "تعذّر فتح الوردية");
          }}
        >
          <Play className="size-4" />
          فتح وردية
        </Button>
      </div>

      <DataTable
        title="سجل الورديات"
        data={rows}
        columns={columns}
        rowId={(row) => row.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تقفيل الوردية",
                icon: <LockKeyhole className="size-4" />,
                disabled: row.status === "closed",
                onSelect: () => {
                  setTarget(row);
                  setCounted(String(safeBalance(data, row.safeId)));
                  setReason("");
                  setSettle(true);
                },
              },
              {
                label: "طباعة تقرير التقفيل",
                icon: <Printer className="size-4" />,
                onSelect: () =>
                  printRecord(`تقرير تقفيل وردية ${row.no}`, [
                    ["رقم الوردية", row.no],
                    ["الخزينة", safeName(row.safeId)],
                    ["أمين الخزينة", userName(row.userId)],
                    ["وقت الفتح", dateTimeFmt(row.openedAt)],
                    ["وقت التقفيل", row.closedAt ? dateTimeFmt(row.closedAt) : "-"],
                    ["رصيد الفتح", money(row.openingBalance)],
                    ["الرصيد الدفتري", money(row.systemBalance ?? safeBalance(data, row.safeId))],
                    ["النقدية الفعلية", row.countedBalance === null ? "-" : money(row.countedBalance)],
                    ["الفرق", row.difference === null ? "-" : money(row.difference)],
                    ["سبب الفرق", row.reason || "-"],
                    ["الحالة", row.status === "open" ? "مفتوحة" : "مقفلة"],
                  ]),
              },
            ]}
          />
        )}
      />

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>تقفيل الوردية {target?.no}</DialogTitle>
            <DialogDescription>
              الرصيد الدفتري الحالي: {target ? money(safeBalance(data, target.safeId)) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">النقدية الفعلية المحصورة (ج.م)</Label>
              <Input
                type="number"
                step="0.01"
                className="text-right"
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
              />
            </div>
            {target && counted !== "" ? (
              <p className="text-sm">
                الفرق:{" "}
                <strong className={Number(counted) - safeBalance(data, target.safeId) === 0 ? "text-primary" : "text-destructive"}>
                  {money(Number(counted) - safeBalance(data, target.safeId))}
                </strong>
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">سبب الفرق</Label>
              <Textarea dir="rtl" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settle} onCheckedChange={setSettle} />
              <Label className="text-sm">تسجيل الفرق كحركة تسوية على الخزينة</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              إلغاء
            </Button>
            <Button onClick={submitClose} className="gap-1.5">
              <LockKeyhole className="size-4" />
              تأكيد التقفيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
