import { createFileRoute } from "@tanstack/react-router";

import { ExpensesPage } from "@/components/hr/ExpensesPage";

export const Route = createFileRoute("/expenses/list/")({
  head: () => ({
    meta: [
      { title: "سجل المصروفات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "كل حركات الصرف بالبنود والمستفيدين وطرق الدفع مع الطباعة." },
      { property: "og:title", content: "سجل المصروفات" },
      { property: "og:description", content: "فلترة المصروفات بالتاريخ والبند والموظف وطباعة أى مستند صرف." },
    ],
  }),
  component: ExpensesPage,
});
