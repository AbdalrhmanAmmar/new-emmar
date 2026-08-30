import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/hr")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الموظفون والحضور — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "تكويد الموظفين وأجورهم، التحضير اليومى، مسير الرواتب، وكشف حساب كل موظف قابل للطباعة.",
      },
      { property: "og:title", content: "موديول الموظفين" },
      { property: "og:description", content: "حضور وغياب وتأخير وساعات إضافية ومستحقات محسوبة تلقائيًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppLayout,
});
