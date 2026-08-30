import { createFileRoute } from "@tanstack/react-router";

import { PurchaseReport } from "@/components/purchases/PurchasesDashboard";

export const Route = createFileRoute("/purchases/reports/by-supplier")({
  head: () => ({
    meta: [
      { title: "المشتريات حسب المورد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تحليل فواتير الشراء المُرحّلة بالجنيه المصري." },
      { property: "og:title", content: "المشتريات حسب المورد" },
      { property: "og:description", content: "إجماليات وكميات ونسب المشتريات." },
    ],
  }),
  component: () => <PurchaseReport kind="supplier" />,
});
