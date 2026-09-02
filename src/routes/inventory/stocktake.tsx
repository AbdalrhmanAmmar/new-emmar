import { createFileRoute } from "@tanstack/react-router";

import { StocktakePage } from "@/components/inventory/StocktakePage";

export const Route = createFileRoute("/inventory/stocktake")({
  head: () => ({
    meta: [
      { title: "جرد المخازن — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "جرد فعلى لأصناف المخزن مع تسوية تلقائية للفروق وتحديث الأرصدة الدفترية." },
      { property: "og:title", content: "جرد المخازن" },
      { property: "og:description", content: "أدخل الرصيد الفعلى والنظام يُسوّى الفرق ويحدّث الأرصدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StocktakePage,
});
