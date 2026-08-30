import { createFileRoute } from "@tanstack/react-router";

import { SalesDashboard } from "@/components/sales/SalesDashboard";

export const Route = createFileRoute("/sales/")({
  head: () => ({
    meta: [
      { title: "لوحة المبيعات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "مؤشرات المبيعات والتحصيل والأصناف الأكثر حركة." },
      { property: "og:title", content: "لوحة المبيعات" },
      { property: "og:description", content: "نظرة سريعة على المبيعات والتحصيل والمخزون." },
    ],
  }),
  component: SalesDashboard,
});
