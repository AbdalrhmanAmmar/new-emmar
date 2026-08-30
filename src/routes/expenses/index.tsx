import { createFileRoute } from "@tanstack/react-router";

import { ExpensesDashboard } from "@/components/hr/ExpensesDashboard";

export const Route = createFileRoute("/expenses/")({
  head: () => ({
    meta: [
      { title: "لوحة المصروفات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "مؤشرات ورسومات تحليلية للمصروفات العامة والنثريات والرواتب." },
      { property: "og:title", content: "لوحة المصروفات" },
      { property: "og:description", content: "اتجاه المنصرف وأعلى بنود الصرف والتوزيع حسب النوع." },
    ],
  }),
  component: ExpensesDashboard,
});
