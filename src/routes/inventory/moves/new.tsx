import { createFileRoute } from "@tanstack/react-router";

import { StockMoveForm } from "@/components/inventory/StockMoveForm";

export const Route = createFileRoute("/inventory/moves/new")({
  head: () => ({
    meta: [
      { title: "إذن مخزني جديد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إنشاء إذن إضافة أو صرف أو تحويل أو تسوية بعدة أصناف ووحدات." },
      { property: "og:title", content: "إذن مخزني جديد" },
      { property: "og:description", content: "أصناف متعددة ووحدات تحويل مع أثر فورى على المخزون." },
    ],
  }),
  component: () => <StockMoveForm />,
});
