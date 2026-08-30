import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Pencil,
  Plus,
  Printer,
  Send,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { Button } from "@/components/ui/button";
import { dateFmt, money, num } from "@/lib/format";
import { moveQty, moveValue, warehouseName } from "@/lib/inventory";
import { backfillInvoiceMoves, deleteStockMove, setStockMoveStatus } from "@/lib/inventoryActions";
import {
  MOVE_KIND_LABEL,
  MOVE_SOURCE_LABEL,
  useDb,
  type StockMove,
  type StockMoveKind,
} from "@/lib/mockDb";
import { printStockMove } from "@/lib/printMove";

const KIND_TONE: Record<StockMoveKind, "green" | "gold" | "red" | "gray"> = {
  in: "green",
  out: "red",
  transfer: "gold",
  adjust: "gray",
};

export function StockMovesPage({ kind }: { kind?: StockMoveKind }) {
  const data = useDb();
  const navigate = useNavigate();

  // توليد الأذون التلقائية للفواتير المُرحّلة السابقة (آمن ولا يكرر)
  useEffect(() => {
    backfillInvoiceMoves();
  }, []);

  const all = [...data.stockMoves]
    .filter((m) => (kind ? m.kind === kind : true))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.no < b.no ? 1 : -1));

  const posted = all.filter((m) => m.status === "posted");

  const columns: Array<Column<StockMove>> = [
    { key: "no", header: "رقم الإذن", cell: (r) => r.no, text: (r) => r.no },
    { key: "date", header: "التاريخ", cell: (r) => dateFmt(r.date), text: (r) => r.date },
    {
      key: "kind",
      header: "نوع الإذن",
      align: "center",
      cell: (r) => <StatusBadge label={MOVE_KIND_LABEL[r.kind]} tone={KIND_TONE[r.kind]} />,
      text: (r) => MOVE_KIND_LABEL[r.kind],
    },
    { key: "refNo", header: "الرقم المرجعى", cell: (r) => r.refNo || "-", text: (r) => r.refNo },
    { key: "refCode", header: "كود الفاتورة", cell: (r) => r.refCode || "-", text: (r) => r.refCode },
    {
      key: "source",
      header: "المصدر",
      cell: (r) => MOVE_SOURCE_LABEL[r.source],
      text: (r) => MOVE_SOURCE_LABEL[r.source],
    },
    {
      key: "warehouse",
      header: "المخزن",
      cell: (r) =>
        r.kind === "transfer"
          ? `${warehouseName(data, r.warehouseId)} → ${warehouseName(data, r.toWarehouseId)}`
          : warehouseName(data, r.warehouseId),
      text: (r) => warehouseName(data, r.warehouseId),
    },
    { key: "party", header: "الجهة", cell: (r) => r.partyName || "-", text: (r) => r.partyName },
    { key: "items", header: "الأصناف", align: "center", cell: (r) => r.lines.length },
    { key: "qty", header: "إجمالي الكمية", cell: (r) => num(moveQty(r)) },
    { key: "value", header: "قيمة الإذن", cell: (r) => money(moveValue(r)) },
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

  const title = kind ? MOVE_KIND_LABEL[kind] : "كل الأذون المخزنية";

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description="كل إذن شراء يولّد إذن إضافة مخزون تلقائياً، وكل فاتورة بيع تولّد إذن صرف مخزني برقم مرجعى مرتبط بكود ورقم الفاتورة"
        actions={
          <>
            <Button asChild className="gap-1.5">
              <Link to="/inventory/moves/new">
                <Plus className="size-4" />
                إذن مخزني جديد
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1.5">
              <Link to="/inventory/balance">
                <SlidersHorizontal className="size-4" />
                أرصدة المخازن
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="أذون الإضافة"
          value={num(posted.filter((m) => m.kind === "in").length)}
          icon={<ArrowDownToLine className="size-4" />}
        />
        <StatCard
          label="أذون الصرف"
          value={num(posted.filter((m) => m.kind === "out").length)}
          tone="danger"
          icon={<ArrowUpFromLine className="size-4" />}
        />
        <StatCard
          label="التحويلات بين المخازن"
          value={num(posted.filter((m) => m.kind === "transfer").length)}
          tone="accent"
          icon={<ArrowLeftRight className="size-4" />}
        />
        <StatCard
          label="قيمة الحركة الإجمالية"
          value={money(posted.reduce((s, m) => s + moveValue(m), 0))}
          tone="muted"
        />
      </div>

      <DataTable
        data={all}
        columns={columns}
        rowId={(r) => r.id}
        title={title}
        searchPlaceholder="ابحث برقم الإذن أو الرقم المرجعى أو كود الفاتورة أو المخزن..."
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "طباعة الإذن",
                icon: <Printer className="size-4" />,
                onSelect: () => printStockMove(data, row),
              },
              {
                label: "تعديل",
                icon: <Pencil className="size-4" />,
                disabled: row.source !== "manual",
                onSelect: () => navigate({ to: "/inventory/moves/$id", params: { id: row.id } }),
              },
              {
                label: row.status === "posted" ? "إرجاع لمسودة" : "ترحيل",
                icon: row.status === "posted" ? <Undo2 className="size-4" /> : <Send className="size-4" />,
                disabled: row.source !== "manual",
                onSelect: () => {
                  const res = setStockMoveStatus(row.id, row.status === "posted" ? "draft" : "posted");
                  if (!res.ok) toast.error(res.error);
                  else toast.success("تم تحديث حالة الإذن");
                },
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                disabled: row.source !== "manual",
                onSelect: () => {
                  const res = deleteStockMove(row.id);
                  if (!res.ok) toast.error(res.error);
                  else toast.success("تم حذف الإذن");
                },
              },
            ]}
          />
        )}
      />
    </div>
  );
}
