import { createFileRoute } from "@tanstack/react-router";

import { StockMovesPage } from "@/components/inventory/StockMovesPage";

export const Route = createFileRoute("/inventory/moves/receipts")({
  head: () => ({
    meta: [
      { title: "أذون إضافة المخزون — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "أذون إضافة المخزون المتولدة تلقائياً من فواتير المشتريات." },
      { property: "og:title", content: "أذون إضافة المخزون" },
      { property: "og:description", content: "استلام البضاعة بالمخزن برقم مرجعى لفاتورة الشراء." },
    ],
  }),
  component: () => <StockMovesPage kind="in" />,
});
