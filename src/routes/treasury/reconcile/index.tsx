import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateFmt, money } from "@/lib/format";
import { METHOD_LABEL, partyName, useDb, type Voucher } from "@/lib/mockDb";
import { safeBalance } from "@/lib/treasury";
import { toggleReconciled } from "@/lib/treasuryActions";

export const Route = createFileRoute("/treasury/reconcile/")({
  head: () => ({
    meta: [
      { title: "المطابقة النقدية والبنكية — الخزينة" },
      { name: "description", content: "مطابقة سندات الخزينة والبنك مع كشف الحساب وتحديد الحركات غير المطابقة." },
      { property: "og:title", content: "المطابقة النقدية والبنكية" },
      { property: "og:description", content: "تعليم الحركات المطابقة ومقارنة الرصيد الدفتري برصيد الكشف." },
    ],
  }),
  component: ReconcilePage,
});

function ReconcilePage() {
  const data = useDb();
  const [safeId, setSafeId] = useState(data.safes.find((s) => s.type === "bank")?.id ?? data.safes[0]?.id ?? "");
  const [statementBalance, setStatementBalance] = useState("");

  const rows = useMemo(
    () =>
      data.vouchers
        .filter((v) => v.safeId === safeId && v.status === "posted")
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data, safeId],
  );

  const unmatched = rows.filter((row) => !row.reconciled);
  const bookBalance = safeBalance(data, safeId);
  const unmatchedNet = unmatched.reduce(
    (acc, row) => acc + (row.kind === "receipt" ? row.amount : -row.amount),
    0,
  );
  const difference = statementBalance === "" ? null : Number(statementBalance) - bookBalance;

  const columns: Array<Column<Voucher>> = [
    { key: "no", header: "المستند", cell: (row) => <strong>{row.no}</strong>, text: (row) => row.no },
    { key: "date", header: "التاريخ", cell: (row) => dateFmt(row.date), text: (row) => dateFmt(row.date) },
    { key: "kind", header: "النوع", cell: (row) => (row.kind === "receipt" ? "قبض" : "صرف"), text: (row) => (row.kind === "receipt" ? "قبض" : "صرف") },
    {
      key: "party",
      header: "الطرف",
      cell: (row) =>
        row.partyType === "other"
          ? (data.categories.find((c) => c.id === row.categoryId)?.name ?? "-")
          : partyName(data, row.partyType, row.partyId),
      text: (row) => partyName(data, row.partyType, row.partyId),
    },
    { key: "method", header: "طريقة الدفع", cell: (row) => METHOD_LABEL[row.method], text: (row) => METHOD_LABEL[row.method] },
    { key: "reference", header: "رقم المرجع", cell: (row) => row.reference || "-", text: (row) => row.reference },
    {
      key: "amount",
      header: "المبلغ",
      cell: (row) => (
        <strong className={row.kind === "receipt" ? "text-primary" : "text-destructive"}>{money(row.amount)}</strong>
      ),
      text: (row) => String(row.amount),
    },
    {
      key: "reconciled",
      header: "المطابقة",
      align: "center",
      cell: (row) => (
        <StatusBadge label={row.reconciled ? "مطابق" : "غير مطابق"} tone={row.reconciled ? "green" : "gold"} />
      ),
      text: (row) => (row.reconciled ? "مطابق" : "غير مطابق"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="المطابقة النقدية والبنكية" description="مطابقة حركات الخزينة أو الحساب البنكي مع كشف الحساب" />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">الخزينة / الحساب</Label>
          <SearchSelect
            options={data.safes.map((s) => ({ value: s.id, label: s.name, hint: s.code }))}
            value={safeId}
            onChange={setSafeId}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">رصيد كشف الحساب (ج.م)</Label>
          <Input
            type="number"
            step="0.01"
            className="text-right"
            value={statementBalance}
            onChange={(e) => setStatementBalance(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="الرصيد الدفتري" value={money(bookBalance)} />
        <StatCard label="حركات غير مطابقة" value={String(unmatched.length)} tone="accent" />
        <StatCard label="صافي غير المطابق" value={money(unmatchedNet)} tone="muted" />
        <StatCard
          label="فرق المطابقة"
          value={difference === null ? "-" : money(difference)}
          hint={difference !== null && Math.abs(difference) < 0.01 ? "مطابق تماماً" : "يحتاج مراجعة"}
          tone={difference !== null && Math.abs(difference) < 0.01 ? "primary" : "danger"}
        />
      </div>

      <DataTable
        title="حركات المطابقة"
        data={rows}
        columns={columns}
        rowId={(row) => row.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: row.reconciled ? "إلغاء المطابقة" : "تعليم كمطابق",
                icon: row.reconciled ? <Circle className="size-4" /> : <CheckCircle2 className="size-4" />,
                onSelect: () => {
                  toggleReconciled(row.id);
                  toast.success("تم تحديث حالة المطابقة");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}
