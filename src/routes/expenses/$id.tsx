import { createFileRoute } from "@tanstack/react-router";

import { ExpenseForm } from "@/components/hr/ExpenseForm";
import { useDb } from "@/lib/mockDb";

export const Route = createFileRoute("/expenses/$id")({
  head: () => ({
    meta: [
      { title: "تعديل مصروف — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل بيانات مستند صرف قائم وإعادة ترحيله." },
      { property: "og:title", content: "تعديل مصروف" },
      { property: "og:description", content: "تعديل البند والمبلغ والمستفيد وطريقة السداد." },
    ],
  }),
  component: EditExpense,
});

function EditExpense() {
  const { id } = Route.useParams();
  const data = useDb();
  const expense = data.expenses.find((e) => e.id === id);
  if (!expense) return <p className="p-6 text-sm text-muted-foreground">المصروف غير موجود</p>;
  return <ExpenseForm expense={expense} />;
}
