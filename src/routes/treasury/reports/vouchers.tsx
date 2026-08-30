import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateFmt, money } from "@/lib/format";
import { METHOD_LABEL, STATUS_LABEL, partyName, useDb, type Voucher } from "@/lib/mockDb";

export const Route = createFileRoute("/treasury/reports/vouchers")({
  head: () => ({
    meta: [
      { title: "تحليل السندات — تقارير الخزينة" },
      { name: "description", content: "تحليل سندات القبض والصرف حسب الفترة والخزينة والفرع والمستخدم." },
      { property: "og:title", content: "تحليل السندات المالية" },
      { property: "og:description", content: "فلترة السندات وتصنيفها حسب الخزينة والفرع وطريقة الدفع." },
    ],
  }),
  component: VouchersReport,
});

function VouchersReport() {
  const data = useDb();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [safeId, setSafeId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [userId, setUserId] = useState("");
  const [kind, setKind] = useState("");

  const rows = useMemo(
    () =>
      data.vouchers.filter((v) => {
        if (v.status !== "posted") return false;
        if (from && v.date < from) return false;
        if (to && v.date > to) return false;
        if (safeId && v.safeId !== safeId) return false;
        if (branchId && v.branchId !== branchId) return false;
        if (userId && v.userId !== userId) return false;
        if (kind && v.kind !== kind) return false;
        return true;
      }),
    [data, from, to, safeId, branchId, userId, kind],
  );

  const receipts = rows.filter((r) => r.kind === "receipt").reduce((acc, r) => acc + r.amount, 0);
  const payments = rows.filter((r) => r.kind === "payment").reduce((acc, r) => acc + r.amount, 0);

  const columns: Array<Column<Voucher>> = [
    { key: "no", header: "السند", cell: (row) => <strong>{row.no}</strong>, text: (row) => row.no },
    { key: "kind", header: "النوع", cell: (row) => (row.kind === "receipt" ? "قبض" : "صرف"), text: (row) => (row.kind === "receipt" ? "قبض" : "صرف") },
    { key: "date", header: "التاريخ", cell: (row) => dateFmt(row.date), text: (row) => dateFmt(row.date) },
    {
      key: "party",
      header: "الطرف / البند",
      cell: (row) =>
        row.partyType === "other"
          ? (data.categories.find((c) => c.id === row.categoryId)?.name ?? "-")
          : partyName(data, row.partyType, row.partyId),
      text: (row) => partyName(data, row.partyType, row.partyId),
    },
    {
      key: "safe",
      header: "الخزينة",
      cell: (row) => data.safes.find((s) => s.id === row.safeId)?.name ?? "-",
      text: (row) => data.safes.find((s) => s.id === row.safeId)?.name ?? "",
    },
    {
      key: "branch",
      header: "الفرع",
      cell: (row) => data.branches.find((b) => b.id === row.branchId)?.name ?? "-",
      text: (row) => data.branches.find((b) => b.id === row.branchId)?.name ?? "",
    },
    {
      key: "user",
      header: "المستخدم",
      cell: (row) => data.users.find((u) => u.id === row.userId)?.name ?? "-",
      text: (row) => data.users.find((u) => u.id === row.userId)?.name ?? "",
    },
    { key: "method", header: "طريقة الدفع", cell: (row) => METHOD_LABEL[row.method], text: (row) => METHOD_LABEL[row.method] },
    { key: "amount", header: "المبلغ", cell: (row) => <strong>{money(row.amount)}</strong>, text: (row) => String(row.amount) },
    { key: "status", header: "الحالة", cell: (row) => STATUS_LABEL[row.status], text: (row) => STATUS_LABEL[row.status] },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="تحليل السندات المالية" description="فلترة وتحليل سندات القبض والصرف المُرحّلة" />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">من تاريخ</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">النوع</Label>
          <SearchSelect
            options={[
              { value: "", label: "الكل" },
              { value: "receipt", label: "سندات قبض" },
              { value: "payment", label: "سندات صرف" },
            ]}
            value={kind}
            onChange={setKind}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">الخزينة</Label>
          <SearchSelect
            options={[{ value: "", label: "كل الخزن" }, ...data.safes.map((s) => ({ value: s.id, label: s.name }))]}
            value={safeId}
            onChange={setSafeId}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">الفرع</Label>
          <SearchSelect
            options={[{ value: "", label: "كل الفروع" }, ...data.branches.map((b) => ({ value: b.id, label: b.name }))]}
            value={branchId}
            onChange={setBranchId}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">المستخدم</Label>
          <SearchSelect
            options={[{ value: "", label: "كل المستخدمين" }, ...data.users.map((u) => ({ value: u.id, label: u.name }))]}
            value={userId}
            onChange={setUserId}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي المقبوضات" value={money(receipts)} />
        <StatCard label="إجمالي المدفوعات" value={money(payments)} tone="danger" />
        <StatCard label="الصافي" value={money(receipts - payments)} tone="accent" />
      </div>

      <DataTable title="السندات المطابقة للفلترة" data={rows} columns={columns} rowId={(row) => row.id} />
    </div>
  );
}
