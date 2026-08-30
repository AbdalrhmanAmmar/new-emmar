import { createFileRoute } from "@tanstack/react-router";

import { StockMovesPage } from "@/components/inventory/StockMovesPage";

export const Route = createFileRoute("/inventory/moves/transfers")({
  head: () => ({
    meta: [
      { title: "التحويل بين المخازن — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "أذون تحويل الأصناف بين المخازن الرئيسية والفرعية." },
      { property: "og:title", content: "التحويل بين المخازن" },
      { property: "og:description", content: "نقل الأرصدة من مخزن لآخر بدون أثر على إجمالي المخزون." },
    ],
  }),
  component: () => <StockMovesPage kind="transfer" />,
});
