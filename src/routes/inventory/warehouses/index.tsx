import { createFileRoute } from "@tanstack/react-router";

import { WarehousesPage } from "@/components/inventory/WarehousesPage";

export const Route = createFileRoute("/inventory/warehouses/")({
  head: () => ({
    meta: [
      { title: "تكويد المخازن — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تكويد مخازن رئيسية ومخازن فرعية تابعة بأمين مخزن وفرع لكل مخزن." },
      { property: "og:title", content: "تكويد المخازن الرئيسية والفرعية" },
      { property: "og:description", content: "أرصدة وقيمة المخزون لكل مخزن مع منع تكرار الأكواد." },
    ],
  }),
  component: WarehousesPage,
});
