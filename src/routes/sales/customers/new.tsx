import { createFileRoute } from "@tanstack/react-router";

import { CustomerFormPage } from "@/components/sales/CustomersPage";

export const Route = createFileRoute("/sales/customers/new")({
  head: () => ({
    meta: [
      { title: "إضافة عميل جديد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تسجيل عميل جديد ببياناته الأساسية وفرعه." },
      { property: "og:title", content: "إضافة عميل جديد" },
      { property: "og:description", content: "كود العميل والهاتف والفرع." },
    ],
  }),
  component: () => <CustomerFormPage />,
});
