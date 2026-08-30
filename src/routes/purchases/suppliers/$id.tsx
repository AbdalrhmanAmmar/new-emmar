import { createFileRoute } from "@tanstack/react-router";

import { SupplierFormPage } from "@/components/purchases/SuppliersPage";

export const Route = createFileRoute("/purchases/suppliers/$id")({
  head: () => ({
    meta: [
      { title: "تعديل مورد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل بيانات مورد قائم وبيانات الاتصال والفرع." },
      { property: "og:title", content: "تعديل بيانات المورد" },
      { property: "og:description", content: "تحديث اسم المورد وهاتفه وفرعه." },
    ],
  }),
  component: EditSupplier,
});

function EditSupplier() {
  const { id } = Route.useParams();
  return <SupplierFormPage id={id} />;
}
