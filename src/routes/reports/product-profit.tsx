import { createFileRoute } from "@tanstack/react-router";

import { ProductProfitReport } from "@/components/reports/ProductProfitReport";

export const Route = createFileRoute("/reports/product-profit")({
  head: () => ({
    meta: [
      { title: "ربحية الأصناف — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "تقرير ربحية الأصناف: الكمية المباعة ومتوسط السعر والتكلفة وهامش الربح لكل صنف بالجنيه المصري.",
      },
      { property: "og:title", content: "ربحية الأصناف" },
      { property: "og:description", content: "إيراد وتكلفة وهامش ربح كل صنف بعد المرتجعات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductProfitReport,
});
