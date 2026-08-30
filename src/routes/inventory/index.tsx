import { createFileRoute } from "@tanstack/react-router";

import { InventoryDashboard } from "@/components/inventory/InventoryDashboard";

export const Route = createFileRoute("/inventory/")({
  head: () => ({
    meta: [
      { title: "لوحة المخازن — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "مؤشرات ورسومات لحركة المخزون وقيمة الأرصدة لكل مخزن." },
      { property: "og:title", content: "لوحة المخازن والمخزون" },
      { property: "og:description", content: "أذون الإضافة والصرف وقيمة المخزون حسب المخزن." },
    ],
  }),
  component: InventoryDashboard,
});
