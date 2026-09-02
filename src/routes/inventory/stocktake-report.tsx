import { createFileRoute } from "@tanstack/react-router";

import { StocktakeReportPage } from "@/components/inventory/StocktakeReportPage";

export const Route = createFileRoute("/inventory/stocktake-report")({
  head: () => ({
    meta: [
      { title: "تقرير الجرد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "سجل عمليات الجرد السابقة وفروق الزيادة والنقص وقيمتها لكل مخزن." },
      { property: "og:title", content: "تقرير الجرد" },
      { property: "og:description", content: "كل أذون تسوية الجرد قابلة للفلترة والطباعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StocktakeReportPage,
});
