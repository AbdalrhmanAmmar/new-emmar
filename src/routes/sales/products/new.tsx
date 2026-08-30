import { createFileRoute } from "@tanstack/react-router";

import { ProductFormPage } from "@/components/sales/ProductsPage";

export const Route = createFileRoute("/sales/products/new")({
  head: () => ({
    meta: [
      { title: "إضافة صنف جديد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تسجيل صنف علف جديد بأسعاره وباركوده وحد الطلب." },
      { property: "og:title", content: "إضافة صنف جديد" },
      { property: "og:description", content: "بيانات الصنف والأسعار والضريبة والمخزون." },
    ],
  }),
  component: () => <ProductFormPage />,
});
