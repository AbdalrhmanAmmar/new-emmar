import { createFileRoute } from "@tanstack/react-router";

import { ExpenseForm } from "@/components/hr/ExpenseForm";

export const Route = createFileRoute("/expenses/new")({
  head: () => ({
    meta: [
      { title: "مصروف جديد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تسجيل مصروف عام أو نثريات أو راتب أو سلفة موظف من الخزينة." },
      { property: "og:title", content: "تسجيل مصروف جديد" },
      { property: "og:description", content: "اختيار البند والمستفيد والخزينة وطريقة الدفع." },
    ],
  }),
  component: ExpenseForm,
});
