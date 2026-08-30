import { createFileRoute } from "@tanstack/react-router";

import { StockMovesPage } from "@/components/inventory/StockMovesPage";

export const Route = createFileRoute("/inventory/moves/")({
  head: () => ({
    meta: [
      { title: "الأذون المخزنية — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "أذون إضافة وصرف وتحويل وتسوية مع رقم مرجعى مرتبط بكود ورقم الفاتورة." },
      { property: "og:title", content: "الأذون المخزنية" },
      { property: "og:description", content: "أذون تلقائية من المشتريات والمبيعات قابلة للطباعة." },
    ],
  }),
  component: StockMovesPage,
});
