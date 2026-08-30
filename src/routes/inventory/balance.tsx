import { createFileRoute } from "@tanstack/react-router";

import { StockBalancePage } from "@/components/inventory/StockBalancePage";

export const Route = createFileRoute("/inventory/balance")({
  head: () => ({
    meta: [
      { title: "أرصدة المخازن — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "رصيد وقيمة كل صنف داخل كل مخزن مع تنبيه حد الطلب." },
      { property: "og:title", content: "أرصدة المخازن وتقييم المخزون" },
      { property: "og:description", content: "أرصدة محسوبة من أذون الإضافة والصرف والتحويل." },
    ],
  }),
  component: StockBalancePage,
});
