import { createFileRoute } from "@tanstack/react-router";

import { ProductFormPage } from "@/components/sales/ProductsPage";

export const Route = createFileRoute("/sales/products/$id")({
  head: () => ({
    meta: [
      { title: "تعديل صنف — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل بيانات وأسعار صنف علف قائم." },
      { property: "og:title", content: "تعديل صنف" },
      { property: "og:description", content: "تحديث الأسعار والباركود وحد الطلب." },
    ],
  }),
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  return <ProductFormPage id={id} />;
}
