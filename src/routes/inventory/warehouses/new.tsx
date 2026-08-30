import { createFileRoute } from "@tanstack/react-router";

import { WarehouseFormPage } from "@/components/inventory/WarehousesPage";

export const Route = createFileRoute("/inventory/warehouses/new")({
  head: () => ({
    meta: [
      { title: "إضافة مخزن — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إضافة مخزن رئيسي أو فرعي بكود تلقائى وأمين مخزن وفرع." },
      { property: "og:title", content: "إضافة مخزن جديد" },
      { property: "og:description", content: "ربط المخزن الفرعي بمخزن رئيسي مع منع تكرار الأكواد والأسماء." },
    ],
  }),
  component: () => <WarehouseFormPage />,
});
