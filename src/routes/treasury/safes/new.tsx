import { createFileRoute } from "@tanstack/react-router";

import { SafeForm } from "@/components/treasury/SafeForm";

export const Route = createFileRoute("/treasury/safes/new")({
  head: () => ({
    meta: [
      { title: "إضافة خزينة جديدة — الخزينة" },
      { name: "description", content: "تسجيل خزينة رئيسية أو خزينة فرع أو حساب بنكي أو محفظة إلكترونية." },
      { property: "og:title", content: "إضافة خزينة جديدة" },
      { property: "og:description", content: "تحديد النوع والفرع وأمين الخزينة والرصيد الافتتاحي." },
    ],
  }),
  component: () => <SafeForm />,
});
