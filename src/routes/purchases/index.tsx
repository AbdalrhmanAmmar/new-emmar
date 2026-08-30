import { createFileRoute } from "@tanstack/react-router";

import { PurchasesDashboard } from "@/components/purchases/PurchasesDashboard";

export const Route = createFileRoute("/purchases/")({
  head: () => ({
    meta: [
      { title: "لوحة المشتريات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "مؤشرات ورسومات تحليلية للمشتريات والموردين والمستحقات." },
      { property: "og:title", content: "لوحة المشتريات" },
      { property: "og:description", content: "تحليل المشتريات حسب الصنف والمورد واتجاه الشراء." },
    ],
  }),
  component: PurchasesDashboard,
});
