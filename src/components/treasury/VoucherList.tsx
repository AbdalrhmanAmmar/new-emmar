import { Link, useNavigate } from "@tanstack/react-router";
import { Ban, CheckCircle2, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import { dateFmt, money, today } from "@/lib/format";
import {
  METHOD_LABEL,
  STATUS_LABEL,
  partyName,
  useDb,
  type Voucher,
  type VoucherKind,
} from "@/lib/mockDb";
import { printRecord } from "@/lib/printDoc";
import { deleteVoucher, setVoucherStatus, voucherPrintFields } from "@/lib/treasuryActions";

export function VoucherList({ kind }: { kind: VoucherKind }) {
  const data = useDb();
  const navigate = useNavigate();
  const isReceipt = kind === "receipt";
  const rows = data.vouchers
    .filter((v) => v.kind === kind)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.no.localeCompare(a.no)));

  const posted = rows.filter((v) => v.status === "posted");
  const todayTotal = posted.filter((v) => v.date === today()).reduce((acc, v) => acc + v.amount, 0);
  const monthTotal = posted
    .filter((v) => v.date.slice(0, 7) === today().slice(0, 7))
    .reduce((acc, v) => acc + v.amount, 0);

  const columns: Array<Column<Voucher>> = [
    { key: "no", header: "رقم السند", cell: (row) => <strong>{row.no}</strong>, text: (row) => row.no },
    { key: "date", header: "التاريخ", cell: (row) => dateFmt(row.date), text: (row) => dateFmt(row.date) },
    {
      key: "party",
      header: isReceipt ? "المستلم منه" : "المدفوع له",
      cell: (row) =>
        row.partyType === "other"
          ? (data.categories.find((c) => c.id === row.categoryId)?.name ?? "-")
          : partyName(data, row.partyType, row.partyId),
      text: (row) =>
        row.partyType === "other"
          ? (data.categories.find((c) => c.id === row.categoryId)?.name ?? "")
          : partyName(data, row.partyType, row.partyId),
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
    {
      key: "method",
      header: "طريقة الدفع",
      cell: (row) => METHOD_LABEL[row.method],
      text: (row) => METHOD_LABEL[row.method],
    },
    {
      key: "amount",
      header: "المبلغ",
      cell: (row) => <strong className="text-primary">{money(row.amount)}</strong>,
      text: (row) => String(row.amount),
    },
    {
      key: "settled",
      header: "المسوّى على فواتير",
      cell: (row) => money(row.allocations.reduce((acc, a) => acc + a.amount, 0)),
      text: (row) => String(row.allocations.reduce((acc, a) => acc + a.amount, 0)),
    },
    {
      key: "status",
      header: "الحالة",
      align: "center",
      cell: (row) => (
        <StatusBadge
          label={STATUS_LABEL[row.status]}
          tone={row.status === "posted" ? "green" : row.status === "draft" ? "gold" : "red"}
        />
      ),
      text: (row) => STATUS_LABEL[row.status],
    },
  ];

  const print = (row: Voucher) =>
    printRecord(
      `${isReceipt ? "سند قبض" : "سند صرف"} ${row.no}`,
      voucherPrintFields(data, row),
      row.allocations.length
        ? {
            headers: ["الفاتورة", "التاريخ", "إجمالي الفاتورة", "المسدد"],
            rows: row.allocations.map((a) => {
              const inv = data.invoices.find((i) => i.id === a.invoiceId);
              return [inv?.no ?? "-", dateFmt(inv?.date), money(inv?.total ?? 0), money(a.amount)];
            }),
          }
        : undefined,
      `إجمالي السند: ${money(row.amount)}`,
    );

  return (
    <div className="space-y-4">
      <PageHeader
        title={isReceipt ? "سندات القبض" : "سندات الصرف"}
        description={
          isReceipt
            ? "تحصيل من العملاء أو إيرادات متنوعة مع تسوية الفواتير الآجلة"
            : "سداد للموردين أو مصروفات نقدية مع تسوية فواتير الشراء"
        }
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to={isReceipt ? "/treasury/receipts/new" : "/treasury/payments/new"}>
              <Plus className="size-4" />
              {isReceipt ? "سند قبض جديد" : "سند صرف جديد"}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي اليوم" value={money(todayTotal)} />
        <StatCard label="إجمالي الشهر" value={money(monthTotal)} tone="accent" />
        <StatCard label="عدد السندات المُرحّلة" value={String(posted.length)} tone="muted" />
      </div>

      <DataTable
        title={isReceipt ? "سجل سندات القبض" : "سجل سندات الصرف"}
        data={rows}
        columns={columns}
        rowId={(row) => row.id}
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "طباعة",
                icon: <Printer className="size-4" />,
                onSelect: () => print(row),
              },
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () =>
                  navigate({
                    to: isReceipt ? "/treasury/receipts/$id" : "/treasury/payments/$id",
                    params: { id: row.id },
                  }),
              },
              {
                label: row.status === "posted" ? "إرجاع لمسودة" : "ترحيل",
                icon: row.status === "posted" ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />,
                onSelect: () => {
                  const result = setVoucherStatus(row.id, row.status === "posted" ? "draft" : "posted");
                  if (result.ok) toast.success("تم تحديث حالة السند");
                  else toast.error(result.error ?? "تعذّر التحديث");
                },
              },
              {
                label: "إلغاء السند",
                icon: <Ban className="size-4" />,
                disabled: row.status === "cancelled",
                onSelect: () => {
                  const result = setVoucherStatus(row.id, "cancelled");
                  if (result.ok) toast.success("تم إلغاء السند");
                  else toast.error(result.error ?? "تعذّر الإلغاء");
                },
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const result = deleteVoucher(row.id);
                  if (result.ok) toast.success("تم حذف السند");
                  else toast.error(result.error ?? "تعذّر الحذف");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}
