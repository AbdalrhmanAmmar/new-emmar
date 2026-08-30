import { createFileRoute } from "@tanstack/react-router";

import { CustomerFormPage } from "@/components/sales/CustomersPage";

export const Route = createFileRoute("/sales/customers/$id")({
  head: () => ({
    meta: [
      { title: "تعديل عميل — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل بيانات عميل قائم." },
      { property: "og:title", content: "تعديل عميل" },
      { property: "og:description", content: "تحديث الاسم والهاتف والفرع." },
    ],
  }),
  component: EditCustomer,
});

function EditCustomer() {
  const { id } = Route.useParams();
  return <CustomerFormPage id={id} />;
}
