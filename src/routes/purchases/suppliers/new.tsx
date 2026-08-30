import { createFileRoute } from "@tanstack/react-router";

import { SupplierFormPage } from "@/components/purchases/SuppliersPage";

export const Route = createFileRoute("/purchases/suppliers/new")({
  head: () => ({
    meta: [
      { title: "إضافة مورد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تسجيل مورد جديد بكود تلقائى وبيانات الاتصال والفرع." },
      { property: "og:title", content: "إضافة مورد جديد" },
      { property: "og:description", content: "بيانات المورد الأساسية مع منع تكرار الأكواد والأسماء." },
    ],
  }),
  component: () => <SupplierFormPage />,
});
