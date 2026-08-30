import { createFileRoute } from "@tanstack/react-router";

import { ExpenseItemsPage } from "@/components/hr/ExpenseItemsPage";

export const Route = createFileRoute("/expenses/items/")({
  head: () => ({
    meta: [
      { title: "تكويد بنود الصرف — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إضافة وتعديل بنود المصروفات ومجموعاتها ومنع التكرار." },
      { property: "og:title", content: "تكويد بنود الصرف" },
      { property: "og:description", content: "بنود صرف بأكواد ومجموعات تُستخدم فى كل مستندات الصرف." },
    ],
  }),
  component: ExpenseItemsPage,
});
