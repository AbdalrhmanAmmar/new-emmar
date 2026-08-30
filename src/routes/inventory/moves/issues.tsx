import { createFileRoute } from "@tanstack/react-router";

import { StockMovesPage } from "@/components/inventory/StockMovesPage";

export const Route = createFileRoute("/inventory/moves/issues")({
  head: () => ({
    meta: [
      { title: "أذون الصرف المخزني — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "أذون الصرف المخزني المتولدة تلقائياً من فواتير المبيعات." },
      { property: "og:title", content: "أذون الصرف المخزني" },
      { property: "og:description", content: "صرف البضاعة من المخزن برقم مرجعى لفاتورة البيع." },
    ],
  }),
  component: () => <StockMovesPage kind="out" />,
});
