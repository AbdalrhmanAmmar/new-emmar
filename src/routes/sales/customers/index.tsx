import { createFileRoute } from "@tanstack/react-router";

import { CustomersPage } from "@/components/sales/CustomersPage";

export const Route = createFileRoute("/sales/customers/")({
  head: () => ({
    meta: [
      { title: "العملاء — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "بيانات العملاء ومبيعاتهم وأرصدتهم المستحقة." },
      { property: "og:title", content: "العملاء" },
      { property: "og:description", content: "مبيعات ومديونية كل عميل بالجنيه المصري." },
    ],
  }),
  component: CustomersPage,
});
