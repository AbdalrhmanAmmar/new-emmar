import { createFileRoute } from "@tanstack/react-router";

import { SafeForm } from "@/components/treasury/SafeForm";

export const Route = createFileRoute("/treasury/safes/$id")({
  head: () => ({
    meta: [
      { title: "تعديل بيانات خزينة — الخزينة" },
      { name: "description", content: "تعديل بيانات الخزينة أو الحساب البنكي وأمين الخزينة والحالة." },
      { property: "og:title", content: "تعديل بيانات خزينة" },
      { property: "og:description", content: "تحديث النوع والفرع والرصيد الافتتاحي وحالة التشغيل." },
    ],
  }),
  component: EditSafe,
});

function EditSafe() {
  const { id } = Route.useParams();
  return <SafeForm safeId={id} />;
}
