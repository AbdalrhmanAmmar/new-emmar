import { createFileRoute } from "@tanstack/react-router";

import { PurchaseReport } from "@/components/purchases/PurchasesDashboard";

export const Route = createFileRoute("/purchases/reports/by-product")({
  head: () => ({
    meta: [
      { title: "المشتريات حسب الصنف — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تحليل فواتير الشراء المُرحّلة بالجنيه المصري." },
      { property: "og:title", content: "المشتريات حسب الصنف" },
      { property: "og:description", content: "إجماليات وكميات ونسب المشتريات." },
    ],
  }),
  component: () => <PurchaseReport kind="product" />,
});
