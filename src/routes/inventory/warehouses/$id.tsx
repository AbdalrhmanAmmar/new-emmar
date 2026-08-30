import { createFileRoute } from "@tanstack/react-router";

import { WarehouseFormPage } from "@/components/inventory/WarehousesPage";

export const Route = createFileRoute("/inventory/warehouses/$id")({
  head: () => ({
    meta: [
      { title: "تعديل مخزن — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل بيانات مخزن قائم ونوعه وأمين المخزن والفرع." },
      { property: "og:title", content: "تعديل بيانات المخزن" },
      { property: "og:description", content: "تغيير نوع المخزن أو المخزن الرئيسي التابع له." },
    ],
  }),
  component: EditWarehouse,
});

function EditWarehouse() {
  const { id } = Route.useParams();
  return <WarehouseFormPage warehouseId={id} />;
}
