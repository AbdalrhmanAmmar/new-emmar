import { Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Printer, Send, Trash2, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import { dateFmt, money, num } from "@/lib/format";
import { warehouseName } from "@/lib/inventory";
import {
  RETURN_KIND_LABEL,
  RETURN_SETTLE_LABEL,
  useDb,
  type ReturnDoc,
  type ReturnKind,
} from "@/lib/mockDb";
import { printReturn } from "@/lib/printReturn";
import { deleteReturn, setReturnStatus } from "@/lib/returnActions";
import { returnTotals, returnsKpis } from "@/lib/returns";

export function ReturnsPage({ kind }: { kind?: ReturnKind }) {
  const data = useDb();
  const navigate = useNavigate();

  const rows = [...data.returns]
    .filter((r) => (kind ? r.kind === kind : true))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.no < b.no ? 1 : -1));

  const kpis = returnsKpis(data, kind);
  const isPurchase = kind === "purchase";

  const columns: Array<Column<ReturnDoc>> = [
    { key: "no", header: "رقم المرتجع", cell: (r) => r.no, text: (r) => r.no },
    { key: "date", header: "التاريخ", cell: (r) => dateFmt(r.date), text: (r) => r.date },
    {
      key: "kind",
      header: "النوع",
      align: "center",
      cell: (r) => (
        <StatusBadge label={RETURN_KIND_LABEL[r.kind]} tone={r.kind === "sales" ? "gold" : "green"} />
      ),
      text: (r) => RETURN_KIND_LABEL[r.kind],
    },
    { key: "party", header: "الجهة", cell: (r) => r.partyName || "-", text: (r) => r.partyName },
    {
      key: "ref",
      header: "الفاتورة الأصلية",
      cell: (r) => r.refInvoiceNo || "-",
      text: (r) => r.refInvoiceNo,
    },
    {
      key: "warehouse",
      header: "المخزن",
      cell: (r) => warehouseName(data, r.warehouseId),
      text: (r) => warehouseName(data, r.warehouseId),
    },
    { key: "items", header: "الأصناف", align: "center", cell: (r) => r.lines.length },
    { key: "qty", header: "إجمالي الكمية", cell: (r) => num(returnTotals(r.lines).qty) },
    { key: "total", header: "قيمة المرتجع", cell: (r) => money(returnTotals(r.lines).total) },
    {
      key: "settle",
      header: "التسوية",
      cell: (r) => RETURN_SETTLE_LABEL[r.settle],
      text: (r) => RETURN_SETTLE_LABEL[r.settle],
    },
    {
      key: "status",
      header: "الحالة",
      align: "center",
      cell: (r) => (
        <StatusBadge
          label={r.status === "posted" ? "مُرحّل" : r.status === "draft" ? "مسودة" : "ملغي"}
          tone={r.status === "posted" ? "green" : r.status === "draft" ? "gold" : "gray"}
        />
      ),
      text: (r) => (r.status === "posted" ? "مرحل" : "مسودة"),
    },
  ];

  const title = kind ? RETURN_KIND_LABEL[kind] : "كل المرتجعات";

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description="مرتجع المبيعات يرد البضاعة للمخزن ويصدر إشعاراً دائناً للعميل، ومرتجع المشتريات يخرج البضاعة ويصدر إشعاراً مديناً على المورد — وكل مرتجع يولّد إذناً مخزنياً تلقائياً"
        actions={
          <>
            <Button asChild className="gap-1.5">
              <Link to={isPurchase ? "/purchases/returns/new" : "/sales/returns/new"}>
                <Plus className="size-4" />
                مرتجع جديد
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1.5">
              <Link to="/inventory/moves">
                <Undo2 className="size-4" />
                الأذون المخزنية
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد المرتجعات المُرحّلة" value={num(kpis.count)} icon={<Undo2 className="size-4" />} />
        <StatCard label="إجمالي الكميات المرتجعة" value={num(kpis.qty)} tone="accent" />
        <StatCard label="قيمة المرتجعات" value={money(kpis.value)} tone="danger" />
        <StatCard
          label="الردود النقدية"
          value={money(kpis.cashRefunds)}
          tone="muted"
          icon={<Wallet className="size-4" />}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowId={(r) => r.id}
        title={title}
        searchPlaceholder="ابحث برقم المرتجع أو الجهة أو رقم الفاتورة الأصلية..."
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "طباعة المرتجع",
                icon: <Printer className="size-4" />,
                onSelect: () => printReturn(data, row),
              },
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                onSelect: () =>
                  navigate({
                    to: row.kind === "purchase" ? "/purchases/returns/$id" : "/sales/returns/$id",
                    params: { id: row.id },
                  }),
              },
              {
                label: row.status === "posted" ? "إرجاع لمسودة" : "ترحيل",
                icon: row.status === "posted" ? <Undo2 className="size-4" /> : <Send className="size-4" />,
                onSelect: () => {
                  const res = setReturnStatus(row.id, row.status === "posted" ? "draft" : "posted");
                  if (!res.ok) toast.error(res.error);
                  else toast.success("تم تحديث حالة المرتجع");
                },
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const res = deleteReturn(row.id);
                  if (!res.ok) toast.error(res.error);
                  else toast.success("تم حذف المرتجع");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}
