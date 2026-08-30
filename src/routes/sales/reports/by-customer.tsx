import { createFileRoute } from "@tanstack/react-router";

import { SalesReport } from "@/components/sales/SalesDashboard";

export const Route = createFileRoute("/sales/reports/by-customer")({
  head: () => ({
    meta: [
      { title: "تقرير المبيعات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تحليل المبيعات المُرحّلة بالجنيه المصري." },
      { property: "og:title", content: "تقرير المبيعات" },
      { property: "og:description", content: "إجماليات وكميات ونسب المبيعات." },
    ],
  }),
  component: () => <SalesReport kind="customer" />,
});
